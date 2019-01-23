import { NextFunction } from 'connect';
import { Request, Response } from 'express';
import * as joi from 'joi';
import { EnvironmentValidationMiddleware, ValidationMiddleware } from '../middlewares';
import { LoginErrorMessage, LoginSchema } from '../schema';
import { FirebaseAuthEnvironmentMessage, FirebaseAuthEnvironmentSchema } from '../schema/FirebaseAuthEnvironment.schema';
import { HttpMethod } from '../src/DQLAuthentication';
import { DQLEndpoint } from '../src/DQLEndpoint';
import { DQLEndpointController } from '../src/DQLEndpointController';
import { firebaseSignupEmailPassword } from '../src/firebase-auth';
import handleFirebaseError from '../src/firebase-auth/handleFirebaseError';

const validationMethods: HttpMethod[] = [
    'POST'
]

const register: DQLEndpoint = {

    resourcePath: '/register',
    body: {},
    method: 'POST',
    middleware: [],
    env: {
        API_KEY: undefined,
        FIREBASE_HOST: undefined,
        FIREBASE_PORT: undefined
    },
    options: {
        publicDir: 'endpoints/public'
    }

}


class RegisterController extends DQLEndpointController {

    /**
     * Validates that the FIREBASE_PORT, FIREBASE_HOST, API_KEY environment variables have been set
     * and that they are valid to make a request with
     *
     * @param {Request} request
     * @param {Response} response
     * @param {NextFunction} next
     */
    async environment(request: Request, response: Response, next: NextFunction) {
        EnvironmentValidationMiddleware(register.env , FirebaseAuthEnvironmentSchema , FirebaseAuthEnvironmentMessage )(request, response, next)
    }

    /**
     * Handles validating the headers of this request
     *
     * @param {Request} request
     * @param {Response} response
     * @param {NextFunction} next
     * @memberof RegisterController
     */
    async headers(request: Request, response: Response, next: NextFunction) {

        const { error } = joi.object({
            "content-type": joi.string().regex(/application\/(json|x-www-form-urlencoded)/).required()
        }).validate(request.headers, {
            abortEarly: false,
            allowUnknown: true
        })


        if (error === null) {
            next()
        } else {
            response.set('Accept', 'application/json')
            response.status(400).send({
                method: request.method,
                statusCode: 400,
                errors: error,
                headers: request.headers["content-type"],
                message: 'Request required application/json'
            })
        }

    }

    /**
     * Validates the request body 
     *
     * @param {Request} request
     * @param {Response} response
     * @param {NextFunction} next
     * @memberof RegisterController
     */
    async validation(request: Request, response: Response, next: NextFunction) {
        ValidationMiddleware(LoginSchema, LoginErrorMessage)(request, response, next)
    }

    /**
     *  Execute the firebaseAuthLoginEmailPassword command to attempt to sign the user in  with email and password
     *
     * @param {Request} request
     * @param {Response} response
     */
    async post(request: Request, response: Response) {

        const result = await firebaseSignupEmailPassword({
            credentials: {
                email: request.body.email,
                password: request.body.password
            },
            returnSecureToken: true,
            API_KEY: register.env!.API_KEY!
        }).catch((responseError: any) => {
            const error = handleFirebaseError(responseError)
            response.status(error.error.code).send(error)
        })
   
        response.status(200).send(result)
    }


}

register.controller = RegisterController

export default {
    resourcePath: register.resourcePath,
    endpoint: register
}