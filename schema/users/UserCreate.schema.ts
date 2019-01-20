import Joi from 'joi'

const UserCreateSchema = Joi.object({
    id: Joi.string().optional().allow('').label('id'),
    name: Joi.string().required().label('Name'),
    surname: Joi.string().required().label('Surname'),
    email: Joi.string().email().required().label('Email')
})

export { UserCreateSchema }

