import Joi from 'joi'

const CompanyPatchSchema = Joi.object({
    name: Joi.string().optional().label('Name'),
    address: Joi.string().optional().label('Address'),
    street: Joi.string().optional().label('Street'),
    phone: Joi.string().optional().label('Phone')
})

export { CompanyPatchSchema }