import { NextFunction, Request, Response } from "express";
import Joi from 'joi';
import { CompanyRepository } from '../repositories';
import { CompanyCreateSchema } from "../schema/companies/CompanyCreate.schema";
import { CompanyDeleteSchema } from "../schema/companies/CompanyDelete.schema";
import { CompanyPatchSchema } from "../schema/companies/CompanyPatch.schema";
import { DQLEndpoint } from "../src/DQLEndpoint";
import { DQLEndpointController } from "../src/DQLEndpointController";
import { HttpMethod } from "../src/DQLAuthentication";

class CompanyController extends DQLEndpointController {

    constructor () {
        super()
        this.excludeMethods.push('GET' , 'DELETE')
    }

    async headers(request: Request, response: Response, next: NextFunction) {

        if (!this.shouldValidate(request.method as HttpMethod) ) {
            return next()
        }

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

        if (!this.shouldValidate(request.method as HttpMethod) ) {
            return next()
        }

        let objectSchema: Joi.ObjectSchema

        let validationResult = (schema: Joi.ObjectSchema) => {
            return schema.validate(request.body , {
                abortEarly: false
            })
        }

        switch (request.method) {
            case 'DELETE':
                objectSchema = CompanyDeleteSchema
                break;
            case 'PATCH':
                objectSchema = CompanyPatchSchema
                break;
            default:
                objectSchema = CompanyCreateSchema
        }

        const { error } = validationResult(objectSchema)

        if (error === null) {
            next()
        } else {

            let obj: { [key:string] : any } = { errors: {} }
            error.details.filter(i => {
                return i.type !== 'object.allowUnknown'
            })
            .forEach(i => {
                const context = i.context
                if(context === undefined) return
                const key = context.key!
                
                if(obj.errors[key] === undefined) {
                    obj.errors[key] = []
                }

                obj.errors[key].push(i.message) 
            })

            obj.jio = error

            response.status(422).send(obj)
        }

    }

    /**
     * Create Company
     *
     * @param {Request} request
     * @param {Response} response
     * @param {NextFunction} next
     * @memberof CompanyController
     */
    async post(request: Request, response: Response, next: NextFunction) {
        let repo = new CompanyRepository()
        let Company = repo.create(request.body)
        response.status(201).send(Company)
    }

    async patch(request: Request, response: Response, next: NextFunction) {
        let repo = new CompanyRepository()
        let company = repo.update(request.params.id, request.body)

        if (company === undefined) {

            response.status(404).send({
                message: 'Company Not Found'
            })
            return
        }

        response.status(200).send(company)
    }

    async item(request: Request, response: Response, next: NextFunction) {
        let repo = new CompanyRepository()
        let company = repo.get(request.params.id)

        if (company === undefined) {

            response.status(404).send({
                message: 'Company Not Found'
            })
            return
        }

        response.status(200).send(company)
    }

    async delete(request: Request, response: Response, next: NextFunction) {

        let repo = new CompanyRepository()
        let company = repo.delete(request.params.id)

        if (company === undefined) {

            response.status(404).send({
                message: 'Company Not Found'
            })
            return
        }

        response.status(200).send(company)
    }

    async get(request: Request, response: Response, next: NextFunction) {
        let repo = new CompanyRepository()
        let companies = repo.all()
        response.status(200).send(companies)
    }

}


const company: DQLEndpoint<CompanyController> = {
    resourcePath: '/companies',
    method: 'POST',
    body: {},
    controller: new CompanyController
}

const endpoint = {
    resourcePath: company.resourcePath,
    endpoint: company
}

export { endpoint as company };

