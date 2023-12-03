import Joi from 'joi';

const addressSchema = Joi.object()
  .pattern(/\.*/, Joi.alternatives([
    Joi.string().regex(/:/, 'host and port like 127.0.0.1:9090'),
    Joi.object({
      host: Joi.string().required(),
      port: Joi.number().integer().min(0).max(65535).required()
    })
  ]));

const loaderSchemas = {
  constructor: Joi.array().items(
    Joi.object({
      location: Joi.string().required(),
      files: Joi.array().items(Joi.string()).required()
    })
  ).single(),
  init: Joi.object({
    services: addressSchema.optional(),
    isDev: Joi.boolean().optional(),
    packagePrefix: Joi.string().optional(),
    loadOptions: Joi.object().optional(),
    channelOptions: Joi.object().optional(),
    appName: Joi.string().optional()
  }),
  initClients: Joi.object({
    services: addressSchema.required(),
    channelOptions: Joi.object().optional()
  })
};

export default loaderSchemas;
