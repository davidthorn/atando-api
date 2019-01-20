import Joi from 'joi'

const CompanyCreateSchema = Joi.object({
    name: Joi.string().required().label('Name'),
    address: Joi.string().required().label('Address'),
    phone: Joi.string().required().label('Phone')
})

export { CompanyCreateSchema }

