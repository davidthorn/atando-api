import Joi from 'joi'

const UserCreateSchema = Joi.object({
    name: Joi.string().required().label('Name'),
    surname: Joi.string().required().label('Surname'),
    email: Joi.string().email().required().label('Email')
})

export { UserCreateSchema }

