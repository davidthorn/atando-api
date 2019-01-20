import Joi from 'joi'

const CompanyPatchSchema = Joi.object({
    name: Joi.string().optional().label('Name'),
    address: Joi.string().optional().label('Address'),
    phone: Joi.string().optional().label('Phone')
})

export { CompanyPatchSchema }