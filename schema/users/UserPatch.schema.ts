import Joi from 'joi'

const UserPatchSchema = Joi.object({
    id: Joi.string().required().label('id'),
    name: Joi.string().required().label('Name'),
    surname: Joi.string().required().label('Surname'),
    email: Joi.string().email().required().label('Email')
})

export { UserPatchSchema }