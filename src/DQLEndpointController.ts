import { RequestHandler } from "express";
import { HttpMethod } from "./DQLAuthentication";

export interface DQLEndpointControllerType {

    environment?: RequestHandler

    /**
     * Called first 
     *
     * @type {RequestHandler}
     * @memberof EndpointController
     */
    authorization?: RequestHandler

    /**
     * Called if the authorization handler called next()
     *
     * @type {RequestHandler}
     * @memberof EndpointController
     */
    headers?: RequestHandler

    /**
     * Called if the headers handler called next()
     *
     * @type {RequestHandler}
     * @memberof EndpointController
     */
    params?: RequestHandler

    /**
     * Called if the params handler called next()
     *
     * @type {RequestHandler}
     * @memberof EndpointController
     */
    query?: RequestHandler

    /**
     * Called if the query handler called next()
     *
     * @type {RequestHandler}
     * @memberof EndpointController
     */
    validation?: RequestHandler

    /**
     * Called if the request method is GET and validation handler called next()
     *
     * @type {RequestHandler}
     * @memberof EndpointController
     */
    get?: RequestHandler

    /**
     * Called if the request method is GET with an id param and validation handler called next()
     *
     * @type {RequestHandler}
     * @memberof EndpointController
     */
    item?: RequestHandler

    /**
     * Called if the request method is POST and validation handler called next()
     *
     * @type {RequestHandler}
     * @memberof EndpointController
     */
    post?: RequestHandler

    /**
     * Called if the request method is PATCH and validation handler called next()
     *
     * @type {RequestHandler}
     * @memberof EndpointController
     */
    patch?: RequestHandler

    /**
     * Called if the request method is DELETE and validation handler called next()
     *
     * @type {RequestHandler}
     * @memberof EndpointController
     */
    delete?: RequestHandler

    /**
     * Called if the request method is PUT and validation handler called next()
     *
     * @type {RequestHandler}
     * @memberof EndpointController
     */
    put?: RequestHandler

    [key: string]: RequestHandler | undefined | any

}

export class DQLEndpointController implements DQLEndpointControllerType {

    constructor () { }

    [key: string]: any

}