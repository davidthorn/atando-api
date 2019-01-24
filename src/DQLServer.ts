import cors from 'cors';
import e, { Request, RequestHandler, Response } from 'express';
import * as fs from 'fs';
import morgan from 'morgan';
import * as path from 'path';
import { dqllog } from '../log';
import { DQLAuthentication, HttpMethod } from './DQLAuthentication';
import DQLAuthenticationManager from './DQLAuthenticationManager';
import { DQLEndpoint } from './DQLEndpoint';
import { DQLEndpointManager } from './DQLEndpointManager';
import bodyParser = require('body-parser');
import { DQLEndpointController } from './DQLEndpointController';

export class DQLServer<T extends DQLEndpointController> {

    /**
     * The express server
     *
     * @type {e.Express}
     * @memberof DQLServer
     */
    server: e.Express

    port?: number

    host?: string

    endpoints: DQLEndpointManager<T>

    authManager: DQLAuthenticationManager

    constructor () {
        this.endpoints = new DQLEndpointManager()
        this.authManager = new DQLAuthenticationManager()
        this.server = e()
    }

    convertUrl(url: string, params: { [id: string]: string }): string {
        url = url.substring(url.length - 1, url.length) === '/' ? url.substring(0, url.length - 1) : url
        let output = url

        Object.keys(params).forEach(key => {
            output = output.replace(`${params[key]}`, `:${key}`)
        })

        return output

    }

    /**
     * This method handles static content for the endpoint
     * An endpoint should implement the options property and supply
     * add the publicDir property with the name of the folder in which the static files are located
     * 
     *
     * @param {{ resourcePath: string , endpoint: DQLEndpoint}} data
     * @memberof DQLServer
     */
    handleStaticContent(data: { resourcePath: string, endpoint: DQLEndpoint<T> }) {

        if (data.endpoint.options === undefined) return
        const { publicDir, rootDir } = data.endpoint.options!

        let root = rootDir || ''
        if (publicDir === undefined) return
        root = root.length > 0 ? root.substring(root.length - 1, root.length) === '/' ? root : `${root}/` : ''

        this.server.use(data.resourcePath, e.static(`${root}${publicDir!}`, {
            fallthrough: true,
            extensions: ['html'],
            redirect: true
        }))

    }

    /**
     * This is the first middleware which will be called for all requests
     * If this method does not find a middleware with a resourcePath which matches the originalUrl of the request
     * then a 404 will be returned
     * This method does not check if the endpoint can handle the request just that their urls match
     *
     * @param {Request} request
     * @param {Response} response
     * @param {() => void} next
     * @memberof DQL
     */
    handleNotFound(request: Request, response: Response, next: () => void) {
        const endpoint = this.endpoints.getEndpoints()
            .filter(i => { return i.resourcePath === request.originalUrl }).length
        switch (endpoint > 0) {
            case true:
                next()
                break;
            case false:
                /// TODO : Add dev | production output for here
                response.status(404).send({
                    statusCode: 404,
                    url: request.url,
                    message: 'Not Found',
                    resourcePath: request.originalUrl,
                    method: request.method,
                    mount: this.server.mountpath
                })
        }
    }

    /**
     * This method will check that their is an endpoint which can handle this originalUrl 
     * If the endpoints method property matches that of the requests then the next method will be called
     * If the methods do not match then a 405 status will be returned
     *
     * @param {Request} request
     * @param {Response} response
     * @param {() => void} next
     * @memberof DQL
     */
    handleMethodNotAllowed(request: Request, response: Response, next: () => void) {

        dqllog('handleMethodNotAllowed', { params: request.params, originalUrl: request.originalUrl })
        const url = this.convertUrl(request.originalUrl, request.params)
        fs.appendFileSync(path.join(process.cwd(), 'handleMethodNotAllowed.log'), JSON.stringify({ originalUrl: request.originalUrl, _url: url, params: request.params, url: request.url, p: `${url}|${request.method}` }, null, 2), { encoding: 'utf8' })

        const resources = this.endpoints.getEndpoints().filter(i => {
            const regMatch = i.resourcePath.replace(/:[\w\d]+/, '[^\/]+')
            const match = url.match(new RegExp(regMatch, 'g'))
            dqllog('handleMethodNotAllowed match', {
                match, convertedUrl: url, endpoint: i, regMatch
            })
            if (match === null) return false
            if (match[0] === url) return true
            return false
        })

        if (resources.length > 0) {
            /// 405
            const methods = resources.map(i => { return i.endpoint })

            response.set('Allow', methods.map(i => { return i.method }).join(','))

            const responseData = {
                statusCode: 405,
                message: 'Method Not Allowed',
                resourcePath: request.originalUrl,
                method: request.method,
                methodsAllowed: methods.map(i => { return i.method }),
            }

            dqllog('Method Not Allowed', responseData)
            response.status(405).send(responseData)
        } else {
            // 404
            response.status(404).send({
                statusCode: 404,
                message: 'Not Found',
                resourcePath: request.originalUrl,
                method: request.method
            })
        }
    }

    addAuthentication(authentication: DQLAuthentication) {
        this.authManager.add(authentication)
    }

    /**
     * Adds an endpoint to the manager with this resourcePath
     *
     * @param {string} resourcePath
     * @param {DQLEndpoint} endpoint
     * @returns {DQLServer}
     * @memberof DQLServer
     */
    add(resourcePath: string, endpoint: DQLEndpoint<T>): DQLServer<T> {
        this.endpoints.add(resourcePath, endpoint)
        this.handleStaticContent({ resourcePath, endpoint })
        return this
    }

    /// This middleware will be called at the end if no other middleware has sent a request back
    /// this will send a 404 if anyone has any other recommendation please contact me to tell me what it
    /// should be
    handleNotHandledEndpoint() {
        this.server.use((req, res, next) => {

            try {
                /// TODO: This can for sure be reduced
                const endpoint = this.endpoints.getEndpoint(req.originalUrl)
                if (endpoint.middleware === undefined) throw new Error()
                if (req.method !== endpoint.method) throw new Error()

                const endpoints = typeof endpoint.middleware === 'function' ? [endpoint.middleware] : endpoint.middleware

                endpoints.forEach(middleware => {
                    middleware(req, res, next)
                })

            } catch (error) {
                res.status(404).send({
                    statusCode: 404,
                    message: 'Not Found',
                    resourcePath: req.originalUrl
                })
            }
        })
    }

    /**
     * Starts the express server to listen for all requests
     * This method will start all endpoints which have been registered prior listen being executed
     *
     * @memberof DQLServer
     */
    listen() {


        this.handleLogging()

        dqllog('Adding CORS Middlware')
        this.server.use(cors())

        dqllog('Adding Authentication Manager middleware')
        this.server.use(this.authManager.authenticate.bind(this.authManager))

        dqllog('Adding Body urlencoded Parser middleware')
        this.server.use(bodyParser.urlencoded({ extended: true }))

        dqllog('Adding Body json Parser middleware')
        this.server.use(bodyParser.json({}))

        dqllog('Adding Error Handling middleware')
        this.server.use((error: Error, request: Request, response: Response, next: () => void) => {
            if (error instanceof SyntaxError) {
                dqllog('Error happened with request', {
                    url: request.originalUrl,
                    host: request.hostname,
                    params: request.params,
                    query: request.query,
                    body: request.body
                })
                response.status(400).send({
                    method: request.method,
                    resourcePath: request.originalUrl,
                    statusCode: 400,
                    error: "The body of your request is not valid json!"
                })
                return
            }

            response.status(500).send();
        })

        this.endpoints.getEndpoints().forEach(data => {

            dqllog('')
            dqllog('--------------------------------------------------------------------------')
            dqllog('')
            dqllog(`Adding Endpoint middlewares: ${data.resourcePath}:${data.endpoint.method}`)

            dqllog('')
            dqllog('--------------------------------------------------------------------------')

            data = this.mapEnvironmentVariables(data);

            const { resourcePath, endpoint } = data
            const { middleware, controller } = endpoint
            const { validation, environment, headers } = controller || { validation: undefined, environment: undefined, headers: undefined }
            const method = data.endpoint.method

            if (middleware !== undefined) {

                const endpoints = typeof middleware === 'function' ? [middleware] : middleware

                endpoints.forEach(mw => {

                    if (environment !== undefined) {
                        dqllog(`Adding Environment middleware: ${data.resourcePath}:${data.endpoint.method}`)
                        this.callMethod(method, resourcePath, environment.bind(controller))
                    }

                    if (headers !== undefined) {
                        dqllog(`Adding Headers middleware: ${data.resourcePath}:${data.endpoint.method}`)
                        this.callMethod(method, resourcePath, headers.bind(controller))
                    }

                    if (validation !== undefined) {
                        dqllog(`Adding Validaton middleware: ${data.resourcePath}:${data.endpoint.method}`)
                        this.callMethod(method, resourcePath, validation.bind(controller))
                    }

                    dqllog(`Adding ${method} middleware: ${data.resourcePath}:${data.endpoint.method}`)

                    switch (method) {
                        case 'GET':
                            this.server.get(resourcePath, mw)
                            break;
                        case 'DELETE':
                            this.server.delete(resourcePath, mw)
                            break;
                        case 'PATCH':
                            this.server.patch(resourcePath, mw)
                            break;
                        case 'PUT':
                            this.server.put(resourcePath, mw)
                            break;
                        case 'POST':
                            this.server.post(resourcePath, mw)
                            break
                        case 'HEAD':
                            this.server.head(resourcePath, mw)
                            break;
                    }
                })

            }

            dqllog('Completed Adding middleware')
            dqllog('')
            dqllog('---------------------------')
        })


        this.server.use(this.handleMethodNotAllowed.bind(this))

        this.server.listen(this.port || 3000, this.host || 'localhost', () => {
            dqllog('Listening', {
                host: this.host,
                port: this.port
            })
        })

    }

    private callMethod(method: HttpMethod, path: string, middelware: RequestHandler) {
        const m = method.toString().toLowerCase()
        switch (method.toLowerCase().toString()) {
            case 'delete':
                this.server.delete(path, middelware)
                break
            case 'put':
                this.server.put(path, middelware)
                break
            case 'post':
                this.server.post(path, middelware)
                break
            case 'patch':
                this.server.patch(path, middelware)
                break
            case 'get':
                this.server.get(path, middelware)
                break
        }
    }

    private mapEnvironmentVariables(data: { resourcePath: string; endpoint: DQLEndpoint<T> }): { resourcePath: string; endpoint: DQLEndpoint<T>; } {
        if (data.endpoint.env !== undefined) {
            Object.keys(data.endpoint.env).forEach(key => {
                dqllog(`Mapping ENV ${key} : ${process.env[key]} to endpoint ${data.endpoint.resourcePath}:${data.endpoint.method}`)
                data.endpoint.env![key] = process.env[key];
            });
        }

        return data
    }


    /**
     * Handles the logging of all requests and responses which are produced by the server into the request.log and response.log
     *
     * @memberof DQLServer
     */
    handleLogging() {
        const responseAccessLogStream = fs.createWriteStream(path.join(process.cwd(), 'response.log'), { flags: 'a' })
        this.server.use(morgan('combined', { stream: responseAccessLogStream, immediate: false }))

        const requestAccessLogStream = fs.createWriteStream(path.join(process.cwd(), 'request.log'), { flags: 'a' })
        this.server.use(morgan('combined', { stream: requestAccessLogStream, immediate: true }))
    }

}

export default DQLServer
