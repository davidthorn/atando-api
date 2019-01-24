import { RequestHandler } from 'express';
import { DQLEndpointProperty } from './DQLEndpointProperty';
import { DQLEndpointController } from './DQLEndpointController'

export interface DQLEndpointOptions {
    rootDir?: string
    publicDir?: string
}

export interface DQLEndpoint<T extends DQLEndpointController> {

    /**
     *
     *
     * @type {{ [id: string]: DQLEndpointProperty; }}
     */
    body: { [id: string]: DQLEndpointProperty; };

    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'REST'

    header?: { [id: string]: string; };

    middleware?: RequestHandler[] | RequestHandler

    options?: DQLEndpointOptions

    resourcePath: string

    env?: { [id: string]: string | undefined }

    controller?: T
};
