const Joi = require('joi')

const addressSchema = Joi.object()
  .pattern(/\.*/, Joi.alternatives([
    Joi.string().regex(/:/, 'host and port like 127.0.0.1:9090'),
    Joi.object().keys({
      host: Joi.string().required(),
      port: Joi.number().integer().min(0).max(65535).required()
    })
  ]))

const loaderSchemas = {
  constructor: Joi.array().items(Joi.object().keys({
    location: Joi.string().required(),
    files: Joi.array().items(Joi.string()).required()
  })).single(),
  init: Joi.object().keys({
    services: addressSchema.optional(),
    isDev: Joi.boolean().optional(),
    packagePrefix: Joi.string().optional(),
    loadOptions: Joi.object().optional(),
    channelOptions: Joi.object().optional(),
    appName: Joi.string().optional()
  }),
  initClients: Joi.object().keys({
    services: addressSchema.required(),
    channelOptions: Joi.object().optional()
  })
}

module.exports = loaderSchemas
