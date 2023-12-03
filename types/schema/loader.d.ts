import Joi from 'joi'
declare const loaderSchemas: {
  constructor: Joi.ArraySchema<any[]>
  init: Joi.ObjectSchema<any>
  initClients: Joi.ObjectSchema<any>
}
export default loaderSchemas
