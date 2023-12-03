import Joi from 'joi'

const serverSchemas = {
  address: Joi.alternatives([
    Joi.string().regex(/:/, 'host and port like 127.0.0.1:9090'),
    Joi.object({
      host: Joi.string().required(),
      port: Joi.number().integer().min(0).max(65535).required()
    })
  ])
}

export default serverSchemas
