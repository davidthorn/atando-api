import { DQLEndpoint } from './DQLEndpoint';
import { DQLEndpointController } from './DQLEndpointController';
import { dqllog } from '../log';

interface EndpointList<T extends DQLEndpointController>{
    [key:string]: DQLEndpoint<T>
}

export class DQLEndpointManager<T extends DQLEndpointController> {

    /**
     *
     *
     * @type {{ [id: string]: DQLEndpoint }}
     * @memberof BodyDQL
     */
    data: EndpointList<T>

    constructor () {
        this.data = {}
    }

    map(endpoint: DQLEndpoint<T> , method: string): DQLEndpoint<T> {
        let d = Object.create(endpoint)
        d.method = method === 'ITEM' ? 'GET' : method
        switch (method) {
            case 'GET':
                d.resourcePath = `${endpoint.resourcePath}`
                break;
            case 'POST':
                d.resourcePath = `${endpoint.resourcePath}`
                break;
            default:
                d.resourcePath = `${endpoint.resourcePath}/:id`
                break;
        }

        return d
    }

    /**
     * Adds the endpoint to the managers endpoints
     * If skipController is set to true then the controller property 
     * will not be validated and move straight on to using the middleware
     * for the method which is declared
     * If skipController is false then  the controller property will be checkd 
     * and if not undefined then the addControllerEndpoints method will be called
     * to add the individual controller methods as endpoints.
     *
     * @param {string} name
     * @param {DQLEndpoint} endpoint
     * @param {boolean} [skipController=false]
     * @returns
     * @memberof DQLEndpointManager
     */
    add(name: string, endpoint: DQLEndpoint<T>, skipController: boolean = false) {

        if (endpoint.controller !== undefined && !skipController) {
            return this.addControllerEndpoints(endpoint, endpoint.controller, name);
        }

        switch (endpoint.method) {
            case 'REST':
                this.add(name, this.map(endpoint, 'GET'))
                this.add(name, this.map(endpoint, 'POST'))
                this.add(`${name}/:id`, this.map(endpoint, 'PUT'))
                this.add(`${name}/:id`, this.map(endpoint, 'PATCH'))
                this.add(`${name}/:id`, this.map(endpoint, 'DELETE'))
                break
            default:
                this.data[`${name}|${endpoint.method}`] = endpoint
                
        }

    }

    /**
     * Returns and array of property names for the controller 
     *
     * @template T
     * @param {T} controller
     * @returns {string[]}
     * @memberof DQLEndpointManager
     */
    getControllerKeys(controller: T): string[] {

        switch (typeof controller) {
            case 'function':
                return Object.getOwnPropertyNames((controller as DQLEndpointController).prototype)
                break;
            case 'object':
                if (controller instanceof DQLEndpointController) {
                    dqllog('getController Keys' ,  Object.getOwnPropertyNames(Object.getPrototypeOf(controller)))
                    return Object.getOwnPropertyNames(Object.getPrototypeOf(controller))
                } else {
                    return Object.keys(controller)
                }
                break
            default: return []
        }

    }

    /**
     * Method adds an endpoint for all methods in the controller which match HttpMethod
     *
     * @param {DQLEndpoint} endpoint
     * @param {DQLEndpointController} controller
     * @param {string} name
     * @memberof DQLEndpointManager
     */
    addControllerEndpoints(endpoint: DQLEndpoint<T>, controller: T, name: string): void {

        this.getControllerKeys(controller).forEach(key => {

            if([ 'get' ,  'post' , 'item' , 'patch' , 'delete' , 'patch' ].includes(key)) {
                let get_endpoint = this.map({
                    ...endpoint,
                    controller,
                    middleware: controller[key].bind(controller)
                }, key.toUpperCase())
                this.add(get_endpoint.resourcePath, get_endpoint, true);
            }

            // switch (key) {
            //     case 'get':
            //         let get_endpoint = this.map({
            //             ...endpoint,
            //             controller: undefined,
            //             middleware: controller[key]
            //         }, 'GET')
            //         this.add(get_endpoint.resourcePath, get_endpoint, true);
            //         break;
            //     case 'post':
            //         let post_endpoint = this.map({
            //             ...endpoint,
            //             controller,
            //             middleware: controller[key].bind(controller)
            //         }, 'POST')
            //         this.add(post_endpoint.resourcePath, post_endpoint, true);
            //         break;
            //     case 'item':
            //         let item_endpoint = this.map({
            //             ...endpoint,
            //             controller,
            //             middleware: controller[key]
            //         }, 'ITEM')
            //         this.add(item_endpoint.resourcePath, item_endpoint, true);
            //         break;
            //     case 'patch':
            //         let patch_endpoint = this.map({
            //             ...endpoint,
            //             controller,
            //             middleware: controller[key]
            //         }, 'PATCH')
            //         this.add(patch_endpoint.resourcePath, patch_endpoint, true);
            //         break;
            //     case 'put':
            //         let put_endpoint = this.map({
            //             ...endpoint,
            //             controller,
            //             middleware: controller[key]
            //         }, 'PUT')
            //         this.add(put_endpoint.resourcePath, put_endpoint, true);
            //         break;
            //     case 'delete':
            //         let delete_endpoint = this.map({
            //             ...endpoint,
            //             controller,
            //             middleware: controller[key]
            //         }, 'DELETE')
            //         this.add(delete_endpoint.resourcePath, delete_endpoint, true);
            //         break;
            //     default: break;
            // }
        });
    }

    /**
     * Returns true if an endpoint can handle the resource path
     *
     * @param {string} resource
     * @returns {boolean}
     * @memberof DQLEndpointManager
     */
    handlesEndpoint(resource: string): boolean {
        return Object.keys(this.data).filter(i => { i === resource }).length === 1
    }

    /**
     * Returns all endpoints
     *
     * @returns {{ resourcePath: string, endpoint: DQLEndpoint }[]}
     * @memberof DQLEndpointManager
     */
    getEndpoints(): { resourcePath: string, endpoint: DQLEndpoint<T> }[] {
        return Object.keys(this.data).map(key => {
            return {
                resourcePath: key.split('|')[0],
                endpoint: this.getEndpoint(key)
            }
        })
    }

    hasEndpoint(path: string): boolean {
        return this.getEndpoints().filter(i => { return (i.resourcePath === path) ? i : undefined }).length > 0
    }

    /**
     * Not yet implemented
     *
     * @returns {{ [id: string]: any }}
     * @memberof BodyDQL
     */
    loadFile(): { [id: string]: any } {
        this.data = {
            "/app": {
                body: {
                    propertyName: {
                        type: 'boolean'
                    }
                },
                resourcePath: '/app',
                method: 'GET'
            }
        }

        return this.data
    }

    /**
     *
     *
     * @param {string} key
     * @returns {DQLEndpoint}
     * @memberof BodyDQL
     */
    getEndpoint(key: string): DQLEndpoint<T> {
        if (this.data[key] === undefined) {
            throw new Error(`endpoint with key ${key} does not exist`)
        }

        return this.data[key]
    }

}




