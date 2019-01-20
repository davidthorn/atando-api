import Joi from 'joi'

const UserPatchSchema = Joi.object({
    name: Joi.string().optional().label('Name'),
    surname: Joi.string().optional().label('Surname')
})

export { UserPatchSchema }