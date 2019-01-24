import { DQLEndpoint } from './DQLEndpoint'
import { DQLEndpointController } from './DQLEndpointController';
import { RequestHandler } from 'express';
import { HttpMethod } from './DQLAuthentication';

export class DQLEndpointControllerManager<T extends DQLEndpointController> {

    endpoint:DQLEndpoint<T>

    controller: T

    constructor(endpoint: DQLEndpoint<T>) {
        this.endpoint = endpoint
        if(this.endpoint.controller === undefined) throw new Error('The controller property of the endpoint must be set')
        this.controller = this.endpoint.controller
    }

    handle(): DQLEndpoint<T>[] {

        const methods: string[] = [ 'POST' , 'PUT' , 'PATCH' , 'GET' , 'DELETE' ]

        const endpoints: DQLEndpoint<T>[] = Object.keys(this.controller)
                            .filter(i => { return i !== undefined && typeof this.controller[i] === 'function' })
                            .filter(i => {
                                return methods.includes(i.toUpperCase())
                            })
                            .map((i): DQLEndpoint<T> => {
                                return {
                                    ...this.endpoint,
                                    method: i.toUpperCase()  as HttpMethod,
                                    middleware: this.controller[i]   
                                }
                            })

        return endpoints

      

    }
   
} 