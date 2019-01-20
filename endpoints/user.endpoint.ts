import { NextFunction, Request, Response } from "express";
import Joi from 'joi';
import { UserRepository } from '../repositories';
import { UserCreateSchema } from "../schema/users/UserCreate.schema";
import { UserDeleteSchema } from "../schema/users/UserDelete.schema";
import { UserPatchSchema } from "../schema/users/UserPatch.schema";
import { DQLEndpoint } from "../src/DQLEndpoint";
import { DQLEndpointController } from "../src/DQLEndpointController";

class UserController extends DQLEndpointController {

    constructor () {
        super()
    }

    async headers(request: Request, response: Response, next: NextFunction) {
        const { error } = Joi.object({
            "content-type": Joi.string().allow(['application/json', 'x-www-form-urlencoded']).required()
        }).validate(request.headers, {
            allowUnknown: true
        })

        if (error === null) {
            next()
        } else {
            response.status(422).send({
                error: 'headers where incorrect'
            })
        }

    }

    async validation(request: Request, response: Response, next: NextFunction) {

        let objectSchema: Joi.ObjectSchema

        let validationResult = (schema: Joi.ObjectSchema) => {
            return schema.validate(request.body)
        }

        switch (request.method) {
            case 'DELETE':
                objectSchema = UserDeleteSchema
                break;
            case 'PATCH':
                objectSchema = UserPatchSchema
                break;
            default:
                objectSchema = UserCreateSchema
        }

        const { error } = validationResult(objectSchema)

        if (error === null) {
            next()
        } else {
            response.status(422).send(error)
        }

    }

    /**
     * Create User
     *
     * @param {Request} request
     * @param {Response} response
     * @param {NextFunction} next
     * @memberof UserController
     */
    async post(request: Request, response: Response, next: NextFunction) {
        let repo = new UserRepository()
        let user = repo.create(request.body)
        response.status(201).send(user)
    }

    async patch(request: Request, response: Response, next: NextFunction) {
        let repo = new UserRepository()
        let user = repo.update(request.params.id, request.body)

        if (user === undefined) {

            response.status(404).send({
                message: 'User Not Found'
            })
            return
        }

        response.status(200).send(user)
    }

    async item(request: Request, response: Response, next: NextFunction) {
        let repo = new UserRepository()
        let user = repo.get(request.params.id)

        if (user === undefined) {

            response.status(404).send({
                message: 'User Not Found'
            })
            return
        }

        response.status(200).send(user)
    }

    async delete(request: Request, response: Response, next: NextFunction) {

        let repo = new UserRepository()
        let user = repo.delete(request.params.id)

        if (user === undefined) {

            response.status(404).send({
                message: 'User Not Found'
            })
            return
        }

        response.status(200).send(user)
    }

    async get(request: Request, response: Response, next: NextFunction) {
        let repo = new UserRepository()
        let users = repo.all()
        response.status(200).send(users)
    }

}


const user: DQLEndpoint = {
    resourcePath: '/user',
    method: 'POST',
    body: {},
    controller: UserController
}

const endpoint = {
    resourcePath: user.resourcePath,
    endpoint: user
}

export { endpoint as user };
