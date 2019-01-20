import e, { Request, Response, RequestHandler } from 'express';
import * as fs from 'fs';
import morgan from 'morgan';
import * as path from 'path';
import { DQLAuthentication, HttpMethod } from './DQLAuthentication';
import DQLAuthenticationManager from './DQLAuthenticationManager';
import { DQLEndpoint } from './DQLEndpoint';
import { DQLEndpointManager } from './DQLEndpointManager';
import bodyParser = require('body-parser');
import cors from 'cors'

export class DQLServer {

    /**
     * The express server
     *
     * @type {e.Express}
     * @memberof DQLServer
     */
    server: e.Express

    port?: number

    host?: string

    endpoints: DQLEndpointManager

    authManager: DQLAuthenticationManager

    constructor () {
        this.endpoints = new DQLEndpointManager()
        this.authManager = new DQLAuthenticationManager()
        this.server = e()
    }

    convertUrl(url: string, params: { [id: string]: string }): string {

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
    handleStaticContent(data: { resourcePath: string, endpoint: DQLEndpoint }) {

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

        const url = this.convertUrl(request.originalUrl, request.params)
        fs.appendFileSync(path.join(process.cwd(), 'handleMethodNotAllowed.log'), JSON.stringify({ originalUrl: request.originalUrl, _url: url, params: request.params, url: request.url, p: `${url}|${request.method}` }, null, 2), { encoding: 'utf8' })

        const resources = this.endpoints.getEndpoints().filter(i => {
            const regMatch = i.resourcePath.replace(/:[\w\d]+/, '[^\/]+')
            const match = url.match(new RegExp(regMatch, 'g'))
            if (match === null) return false
            if (match[0] === url) return true
            return false
        })

        if (resources.length > 0) {
            /// 405
            const methods = resources.map(i => { return i.endpoint })

            response.set('Allow', methods.map(i => { return i.method }).join(','))

            response.status(405).send({
                statusCode: 405,
                message: 'Method Not Allowed',
                resourcePath: request.originalUrl,
                method: request.method,
                methodsAllowed: methods.map(i => { return i.method }),
            })
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
    add(resourcePath: string, endpoint: DQLEndpoint): DQLServer {
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
        this.server.use(cors())
        this.server.use(this.authManager.authenticate.bind(this.authManager))
        this.server.use(bodyParser.urlencoded({ extended: true }))
        this.server.use(bodyParser.json({}))

        this.server.use((error: Error, request: Request, response: Response, next: () => void) => {
            if (error instanceof SyntaxError) {
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

        // let handlers: RequestHandler[] = []

        // handlers = this.endpoints.getEndpoints().reduce((h: RequestHandler[] , data: { resourcePath: string, endpoint: DQLEndpoint } ): RequestHandler[] => {
        
        //     const { controller } = data.endpoint
        //     if(controller === undefined) return h
        //     const _handlers = Object.keys(controller).filter( key => { return controller[key] !== undefined } ).map(key => {
        //         return controller[key]!
        //     })
    
        //     return h.concat(_handlers)

        // }, handlers)

        // this.server.use(handlers)

        this.endpoints.getEndpoints().forEach(data => {

            data = this.mapEnvironmentVariables(data);

            const { resourcePath, endpoint } = data
            const { middleware, controller } = endpoint
            const { validation, environment , headers} = controller || { validation: undefined, environment: undefined , headers: undefined }
            const method = data.endpoint.method

            if (middleware !== undefined ) {

                const endpoints = typeof middleware === 'function' ? [middleware] : middleware

                endpoints.forEach(mw => {

                    if(environment !== undefined) {
                       this.callMethod(method , resourcePath , environment) 
                    }

                    if(headers !== undefined) {
                        this.callMethod(method , resourcePath , headers) 
                     }
                    
                    if(validation !== undefined) {
                        this.callMethod(method , resourcePath , validation) 
                    }

                    switch (method) {
                        case 'GET':
                            this.server.get(resourcePath, mw.bind(data.endpoint))
                            break;
                        case 'DELETE':
                            this.server.delete(resourcePath, this.handleValidation.bind(this))
                            this.server.delete(resourcePath, mw.bind(data.endpoint))
                            break;
                        case 'PATCH':
                            this.server.patch(resourcePath, this.handleValidation.bind(this))
                            this.server.patch(resourcePath, mw.bind(data.endpoint))
                            break;
                        case 'PUT':
                            this.server.put(resourcePath, this.handleValidation.bind(this))
                            this.server.put(resourcePath, mw.bind(data.endpoint))
                            break;
                        case 'POST':
                            this.server.post(resourcePath, mw.bind(data.endpoint))
                            break
                        case 'HEAD':
                            this.server.head(resourcePath, mw.bind(data.endpoint))
                            break;
                    }
                })

            }
        })


        this.server.use(this.handleMethodNotAllowed.bind(this))

        this.server.listen(this.port || 3000, this.host || 'localhost', () => {
            console.log('listening')
        })

    }

    private callMethod(method: HttpMethod , path: string , middelware: RequestHandler) {
        const m = method.toString().toLowerCase()
        switch(method.toLowerCase().toString()) {
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

    private mapEnvironmentVariables(data: { resourcePath: string; endpoint: DQLEndpoint; }): { resourcePath: string; endpoint: DQLEndpoint; } {
        if (data.endpoint.env !== undefined) {
            Object.keys(data.endpoint.env).forEach(key => {
                data.endpoint.env![key] = process.env[key];
            });
        }

        return data
    }

    handleValidation(request: Request, response: Response, next: () => void) {

        const url = this.convertUrl(request.originalUrl, request.params)
        fs.appendFileSync(path.join(process.cwd(), 'handleValidation.log'), JSON.stringify({ originalUrl: request.originalUrl, _url: url, params: request.params, url: request.url, p: `${url}|${request.method}` }, null, 2), { encoding: 'utf8' })

        if (!this.endpoints.hasEndpoint(`${url}`)) {
            return next()
        }

        const endpoint = this.endpoints.getEndpoints().filter(i => { return i.resourcePath === url && (i.endpoint.method === request.method || i.endpoint.method === 'REST') })
        fs.appendFileSync(path.join(process.cwd(), 'handleValidation.log'), JSON.stringify(endpoint, null, 2), { encoding: 'utf8' })

        switch (request.method) {
            case 'DELETE':
                return next()
            case 'PATCH':
                return next()
            case 'PUT':
                return next()
            case 'POST':
                const errors = this.endpoints.validate({
                    body: request.body === undefined ? {} : request.body,
                    originalPath: `${url}|${request.method}`
                })

                if (errors.length > 0) {
                    fs.appendFileSync(path.join(process.cwd(), 'handleValidation.log'), JSON.stringify(errors, null, 2), { encoding: 'utf8' })
                    response.status(400).send({
                        method: request.method,
                        statusCode: 400,
                        message: 'Bad Request',
                        errors: errors.map(i => { return i.message }),
                        resourcePath: request.originalUrl
                    })
                } else {
                    return next()
                }
                break
        }

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
