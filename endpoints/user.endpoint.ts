import { DQLEndpointController } from "../src/DQLEndpointController";
import { NextFunction, Response, Request } from "express";
import { DQLEndpoint } from "../src/DQLEndpoint";
import Joi from 'joi'
import { users, User } from './users'
import uuid from 'uuid'
import { UserPatchSchema } from "../schema/users/UserPatch.schema";
import { UserDeleteSchema } from "../schema/users/UserDelete.schema";
import { UserCreateSchema } from "../schema/users/UserCreate.schema";

let globalUsers = users

class UserController extends DQLEndpointController {

    saveUser: User[] = users

    constructor() {
        super()
    }

    async headers(request: Request , response: Response , next: NextFunction){ 

        const {  error } = Joi.object({
            "content-type": Joi.string().allow(['application/json' , 'x-www-form-urlencoded']).required()
        }).validate(request.headers, {
            allowUnknown: true
        })

        if(error === null) {
            next()
        } else {
            response.status(422).send({
                error: 'headers where incorrect'
            })
        } 

    }

    async validation(request: Request , response: Response , next: NextFunction){

        let objectSchema: Joi.ObjectSchema

        let validationResult = (schema: Joi.ObjectSchema) => {
            return schema.validate(request.body)
        }

        switch(request.method) {
            case 'DELETE':
            objectSchema = UserDeleteSchema
            break;
            case 'PATCH':
            objectSchema = UserPatchSchema
            break;
            default: 
            objectSchema = UserCreateSchema
        }

        const { value, error  } = validationResult(objectSchema)

        if(error === null) {
            next()
        } else {
            response.status(422).send(error)
        }
        

    }

    async post(request: Request , response: Response , next: NextFunction) {
        globalUsers.push({
            ...request.body,
            id: uuid.v4(),
            deleted: false
        })

        console.log('added user' , globalUsers)

        response.status(201).send({
            message: "success"
        })
    }

    async patch(request: Request , response: Response , next: NextFunction) {
        globalUsers = globalUsers.map( i => {
            if(request.body.id === i.id) {
                return {
                    ...request.body,
                    deleted: false
                }
            }
            return i
        } )
        response.status(200).send({
            message: "updated"
        })
    }

    async delete(request: Request , response: Response , next: NextFunction) {

        globalUsers = globalUsers.map( i => {
            if(request.body.id === i.id) {
                i.deleted = true
            }
            return i
        } )

        response.status(200).send({
            message: "user deleted"
        })
    }

    async get(request: Request , response: Response , next: NextFunction) {
        response.status(200).send(globalUsers.filter(i => { return i.deleted === false } ))
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

export { endpoint as user }