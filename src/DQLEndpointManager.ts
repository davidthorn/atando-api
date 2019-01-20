import { DQLEndpointProperty } from './DQLEndpointProperty';
import { DQLEndpoint } from './DQLEndpoint';
import { isBoolean, isNumber,isString } from './PropertyValidators';
import isboolean from 'lodash.isboolean'
import { DQLEndpointController, DQLEndpointControllerType } from './DQLEndpointController';

export class DQLEndpointManager {

    /**
     *
     *
     * @type {{ [id: string]: DQLEndpoint }}
     * @memberof BodyDQL
     */
    data: { [id: string]: DQLEndpoint }

    constructor () {
        this.data = {}
    }

    map(endpoint: DQLEndpoint, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'): DQLEndpoint {
        let d = Object.create(endpoint)
        d.method = method
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
    add(name: string, endpoint: DQLEndpoint , skipController: boolean = false) {

        if(endpoint.controller !== undefined && !skipController) {
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
    getControllerKeys<T extends DQLEndpointController> (controller: T): string[] {

        switch(typeof controller) {
            case 'function':
            return Object.getOwnPropertyNames((controller as DQLEndpointController ).prototype)
            break;
            case 'object':
            if(controller instanceof DQLEndpointController) {
                return Object.getOwnPropertyNames(Object.getPrototypeOf(controller))
            } else {
                return Object.keys(controller)
            }
            break
            default: return []
        }
        
    }

    /**
     * Returns the prototype for the controller
     *
     * @template T
     * @param {T} controller
     * @returns {DQLEndpointController}
     * @memberof DQLEndpointManager
     */
    getControllerPrototype<T extends DQLEndpointController>(controller: T): DQLEndpointController {
        switch(typeof controller) {
            case 'function':
            return (controller as DQLEndpointController ).prototype
            case 'object':
            if(controller instanceof DQLEndpointController) {
                return (controller as DQLEndpointController).prototype
            } else {
                return controller
            }
            break
            default: 
            throw new Error('not knowing what is going on here')
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
    addControllerEndpoints(endpoint: DQLEndpoint, controller: DQLEndpointController, name: string): void {
        
        const endpointController = this.getControllerPrototype(controller)
        const { validation, handlesMethod, environment, headers } = endpointController
        
        this.getControllerKeys(controller).forEach(key => {
            switch (key) {
                case 'get':
                    this.add(name, this.map({
                        ...endpoint,
                        controller: undefined,
                        middleware: endpointController[key].bind(controller)
                    }, 'GET'));
                    break;
                case 'post':
                    this.add(name, this.map({
                        ...endpoint,
                        controller: { environment, validation, headers, handlesMethod },
                        middleware: endpointController[key].bind(controller)
                    }, 'POST'), true);
                    break;
                case 'patch':
                    this.add(name, this.map({
                        ...endpoint,
                        controller: undefined,
                        middleware: endpointController[key].bind(controller)
                    }, 'PATCH'));
                    break;
                case 'put':
                    this.add(name, this.map({
                        ...endpoint,
                        controller: undefined,
                        middleware: endpointController[key].bind(controller)
                    }, 'PUT'));
                    break;
                case 'delete':
                    this.add(name, this.map({
                        ...endpoint,
                        controller: undefined,
                        middleware: endpointController[key].bind(controller)
                    }, 'DELETE'));
                    break;
                default: break;
            }
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
    getEndpoints(): { resourcePath: string, endpoint: DQLEndpoint }[] {
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
    getEndpoint(key: string): DQLEndpoint {
        if (this.data[key] === undefined) {
            throw new Error(`endpoint with key ${key} does not exist`)
        }

        return this.data[key]
    }

    /**
     *
     *
     * @param {DQLEndpoint} endpoint
     * @returns {BodyDQLEndpointProperty[]}
     * @memberof BodyDQL
     */
    getEndpointProperties(endpoint: DQLEndpoint): DQLEndpointProperty[] {
        return Object.keys(endpoint.body).map(k => { return endpoint.body[k] })
    }

    /**
     *
     *
     * @param {DQLEndpoint} endPoint
     * @param {string} propname
     * @returns {BodyDQLEndpointProperty}
     * @memberof BodyDQL
     */
    getEndpointProperty(endPoint: DQLEndpoint, propname: string): DQLEndpointProperty {

        if (endPoint.body[propname] === undefined) {
            throw new Error(`endpoint property with key ${propname} does not exist`)
        }

        const prop = endPoint.body[propname]
        prop.name = propname
        return prop
    }

    /**
     * Validates all endpoints
     * This method will throw an error if it finds any issue with any of the endpoints
     *
     * @memberof BodyDQL
     */
    validatedEndpoints() {

        Object.keys(this.data).forEach(endPoint => {

            const d = endPoint.match(/^\/([\w\d\-]+)/)
            if (d === null) {
                throw new Error('all endpoints must start with a forwardslash')
            }

            const endPointData = this.data[endPoint]

            if (endPointData.method === 'GET') return

            if (endPointData.body === undefined || endPointData.body === null) {
                throw new Error('all endpoints must contain a body property')
            }

            /// validate all body properties literal names are urlencoded
            Object.keys(endPointData.body).forEach(prop => {

                if (encodeURI(prop) !== prop) {
                    throw new Error('name property value must be urlencoded')
                }

                const property = endPointData.body[prop]
                property.name = prop /// set the name for other functions to use

                if (property.required !== undefined || isboolean(property.required)) {
                    throw new Error(`the property ${prop}'s 'required' value must either be true or false. boolean required`)
                }
            })
        })
    }

    /**
     * Returns true if the endpoints body contains a key value pair with the key
     * If the body does contain this key then true is returned, else false 
     *
     * @param {string} endpoint
     * @param {string} key
     * @returns {boolean}
     * @memberof BodyDQL
     */
    endPointBodycontainsKeys(endpoint: string, key: string): boolean {
        return this.data[endpoint] !== undefined && this.data[endpoint].body[key] !== undefined
    }

    /**
     *
     *
     * @param {{ originalPath: string, body: any }} request
     * @returns {Error[]}
     * @memberof BodyDQL
     */
    validate(request: { originalPath: string, body: any }): Error[] {

        const startErrors: Error[] = []

        const endpoint = this.getEndpoint(request.originalPath)

        const errors: Error[] = Object.keys(endpoint.body)
            .map(key => {
                return {
                    property: this.getEndpointProperty(endpoint, key),
                    value: request.body[key]
                }
            })
            .reduce((r, f) => { return r.concat(this.validateProperty(f)) }, startErrors)

        if (errors.length > 0) {
            //throw new Error('Bad Request')
        }

        return errors

    }

    /**
     * 
     *
     * @param {({ property: BodyDQLEndpointProperty, value: any | undefined | null })} data
     * @returns {Error[]}
     * @memberof BodyDQL
     */
    validateProperty(data: { property: DQLEndpointProperty, value: any | undefined | null }): Error[] {

        const { property, value } = data

        let errors: Error[] = []

        const required = this.isPropertyRequired(property)

        if (!required && !this.hasValue(value)) {
            return []
        }

        if (!this.shouldValidateProperty(property, value)) {
            return []
        }

        if (value === undefined) {
            const requiredErrors = this.getErrorsForProperty('required', property)
            const requiredError = new Error(`property ${property.name!} does not exist`)
            errors = errors.concat(requiredErrors.length > 0 ? requiredErrors : [requiredError])
        }

        /// if the value exists then it should be type checked regardless
        let validatedErrors = this.validateEndpointTypesMatch(property, value)
        errors = errors.concat(validatedErrors)

        return errors

    }

    catchParse(value: any, p: (v: any) => any): any {
        try {
            return p(value)
        } catch (error) {
            return value
        }
    }

    /**
     * validates that the value provided has the matching type
     *
     * @param {BodyDQLEndpointProperty} property
     * @param {*} value
     * @returns {Error[]}
     * @memberof BodyDQL
     */
    validateEndpointTypesMatch(property: DQLEndpointProperty, value: any): Error[] {
        let errors: Error[] = []

        const parse = property.parse === undefined ? (i: any) => { return i } : property.parse!

        const parsedValue = this.catchParse(value, parse)

        switch (property.type) {
            case 'boolean':
                errors = isBoolean(parsedValue, errors);
                break;
            case 'number':
                errors = isNumber(parsedValue, errors);
                break;
            case 'string':
                errors = isString(parsedValue, errors);
                break;
            default: break
        }

        if (errors.length === 0) {
            return []
        }

        const customeErrors = this.getErrorsForProperty('type', property)
        switch (customeErrors.length > 0) {
            case true:
                return customeErrors
            default:
                return errors
        }
    }

    /**
     * Returns true if the value is not undefined or null
     * and if a string it has more then 0 chars
     *
     * @param {(any | undefined | null)} value
     * @returns {boolean}
     * @memberof BodyDQL
     */
    hasValue(value: any | undefined | null): boolean {
        const result = value !== undefined && value !== null
        if (result === true && typeof value === 'string') {
            return value.length > 0
        }

        return result
    }

    /**
     * Returns true if the required property is defined and is true
     * Returns false if required property is undefined or null or is false
     *
     * @param {BodyDQLEndpointProperty} property
     * @returns {boolean}
     * @memberof BodyDQL
     */
    isPropertyRequired(property: DQLEndpointProperty): boolean {
        return property.required === undefined ? false : property.required!
    }

    /**
     * Returns true if value is not undefined or null and required property is not undefined or null and is true
     * Returns false if required property is undefined or null
     *
     * @param {BodyDQLEndpointProperty} property
     * @param {(any | undefined | null)} value
     * @returns {boolean}
     * @memberof BodyDQL
     */
    shouldValidateProperty(property: DQLEndpointProperty, value: any | undefined | null): boolean {
        // let errors: Error[] = []
        switch (this.hasValue(value)) {
            case true: return true
            case false:
                return this.hasValue(property.required) ? property.required! : false
        }
    }

    /**
     * Returns custom errors for this property and which errors key is relates to 
     * so the prop defines which body property it is on the propertyKey defined attribute which it is testing
     * for example if it is testing the type then the property key would be type.
     * If none exists then the default error will be used
     *
     * @param {string} propertyKey
     * @param {BodyDQLEndpointProperty} prop
     * @returns {Error[]}
     * @memberof BodyDQL
     */
    getErrorsForProperty(propertyKey: string, prop: DQLEndpointProperty): Error[] {
        if (prop.errors !== undefined && prop.errors[propertyKey] !== undefined) {
            return prop.errors[propertyKey].map(error => { return new Error(error) })
        }

        return []
    }

}




