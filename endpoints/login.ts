import { NextFunction, Request, Response } from 'express';
import * as joi from 'joi';
import { dqllog } from '../log';
import { EnvironmentValidationMiddleware } from '../middlewares';
import { LoginSchema, ValidateSchema } from '../schema';
import { FirebaseAuthEnvironmentMessage, FirebaseAuthEnvironmentSchema } from '../schema/FirebaseAuthEnvironment.schema';
import { DQLEndpoint } from '../src/DQLEndpoint';
import { DQLEndpointController } from '../src/DQLEndpointController';
import { firebaseAuthLoginEmailPassword } from '../src/firebase-auth';
import handleFirebaseError from '../src/firebase-auth/handleFirebaseError';
import AuthEmailLoginError from '../src/firebase-auth/AuthEmailLoginError';

const convertError = function(credentials: { email: string , password: string } ,  data: AuthEmailLoginError): any {
    let loginError: { status: number, errors: { [key:string] : any } } = { 
        status: 400,
        errors: {} }

    switch(data.error.message) {
        case "EMAIL_NOT_FOUND": 
        loginError.errors.email = [
            `Email address ${credentials.email} was not found`
        ]
        break
        case "INVALID_EMAIL": 
        loginError.errors.email = [
            `Invalid email address`
        ]
        break
        case "USER_DISABLED": 
        loginError.errors.email = [
            `Email address has been disabled`
        ]
        break
        case "INVALID_PASSWORD": 
        loginError.errors.password = [
            `The password is either invalid or incorrect`
        ]
        break
    }
    return loginError
}

class LoginController extends DQLEndpointController {

    /**
     * Validates that the FIREBASE_PORT, FIREBASE_HOST, API_KEY environment variables have been set
     * and that they are valid to make a request with
     *
     * @param {Request} request
     * @param {Response} response
     * @param {NextFunction} next
     */
    async environment(request: Request, response: Response, next: NextFunction) {
        EnvironmentValidationMiddleware(login.env, FirebaseAuthEnvironmentSchema, FirebaseAuthEnvironmentMessage)(request, response, next)
    }

    async headers(request: Request, response: Response, next: NextFunction) {

        dqllog('Testing Headers Middleware', {
            url: request.originalUrl,
            method: request.method,
            headers: request.headers
        })

        const { error } = joi.object({
            "content-type": joi.string().regex(/application\/json/).required()
        }).validate(request.headers, {
            abortEarly: false,
            allowUnknown: true
        })


        if (error === null) {
            next()
        } else {
            response.set('Accept', 'application/json')

            const dataResponse = {
                method: request.method,
                statusCode: 400,
                errors: error,
                headers: request.headers["content-type"],
                message: 'Request required application/json'
            }

            dqllog('Headers Failed: ', dataResponse)

            response.status(400).send(dataResponse)
        }

    }

    async validation(request: Request, response: Response, next: NextFunction) {

        dqllog('Validation request.body Middleware', {
            url: request.originalUrl,
            method: request.method,
            body: {
                ...request.body,
                password: '#§$%§$%§%/&/(&/'
            }
        })

        const { error } = ValidateSchema(LoginSchema, request.body)

        if (error === null) {
            next()
        } else {

            let message = ''

            switch (error.details[0].type) {
                case 'string.email':
                    message = 'INVALID_EMAIL'
                    break
                case 'string.min':
                    message = 'INVALID_PASSWORD'
                    break;
                default: break
            }

            const responseData = convertError(request.body , {
                error: {
                    message,
                    code: 400,
                    errors: error.details.map(i => {
                        return {
                            domain: i.context!.key!,
                            reason: i.type,
                            message: message
                        }
                    })
                }
            })

            dqllog('Failed:', responseData)

            response.status(400).send(responseData)
        }

    }

    /**
     *  Execute the firebaseAuthLoginEmailPassword command to attempt to sign the user in  with email and password
     *
     * @param {Request} request
     * @param {Response} response
     */
    async post(request: Request, response: Response) {

        dqllog(`Validation ${request.originalUrl} ${request.method} Middleware`, {
            url: request.originalUrl,
            method: request.method,
            body: {
                ...request.body,
                password: '#§$%§$%§%/&/(&/'
            }
        })

        const result = await firebaseAuthLoginEmailPassword({
            credentials: {
                email: request.body.email,
                password: request.body.password
            },
            returnSecureToken: true,
            API_KEY: login.env!.API_KEY!
        }).catch((responseError: any) => {
            const error = handleFirebaseError(responseError)
            dqllog('Failed:', error)
            response.status(error.error.code).send(error)
        })

        dqllog('firebaseAuthLoginEmailPassword Response' , result)

        response.status(200).send(result)

    }

}

const login: DQLEndpoint<LoginController> = {

    resourcePath: '/login',
    body: {},
    method: 'POST',
    env: {
        API_KEY: undefined,
        FIREBASE_HOST: undefined,
        FIREBASE_PORT: undefined
    }

}
login.controller = new LoginController


const endpoint = {
    resourcePath: login.resourcePath,
    endpoint: login
}

export { endpoint as login };

