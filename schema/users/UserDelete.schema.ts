import Joi from 'joi'

const UserDeleteSchema = Joi.object({
    id: Joi.string().required().label('id')
})

export { UserDeleteSchema }