const grpc = require('@grpc/grpc-js')
const assert = require('assert')
const compose = require('koa-compose')
const Joi = require('joi')
const debug = require('debug')('grpcity:serverProxy')

const schemas = {
  listen: Joi.object().keys({
    host: Joi.string().ip().required(),
    port: Joi.number().integer().min(0).max(65535).required()
  })
}

class ServerProxy {
  constructor () {
    this._middleware = []
  }

  init (...args) {
    if (!this._server) {
      this._server = new grpc.Server(...args)
    }
    return this
  }

  async listen ({ host, port }, credentials = undefined) {
    assert(this._server, 'must be first init() server before server listen()')
    Joi.assert({ host, port }, schemas.listen, 'server listen() params Error')
    debug('server listen options', { host, port })

    const url = `${host}:${port}`
    const bindPort = await new Promise((resolve, reject) => {
      this._server.bindAsync(url, credentials || this.makeServerCredentials(), (err, result) => (
        err ? reject(err) : resolve(result))
      )
    })
    assert(bindPort === port, 'server bind port not to be right')

    this._server.start()
  }

  forceShutdown () {
    const res = this._server.forceShutdown()
    delete this._server
    return res 
  }

  tryShutdown (callback) {
    const res = this._server.tryShutdown(callback)
    delete this._server
    return res 
  }

  makeServerCredentials (rootCerts, keyCertPairs, checkClientCertificate) {
    if (rootCerts) {
      return grpc.ServerCredentials.createSsl(rootCerts, keyCertPairs, checkClientCertificate)
    } else {
      if (!this._insecureServerCredentials) {
        this._insecureServerCredentials = grpc.ServerCredentials.createInsecure()
      }
      return this._insecureServerCredentials
    }
  }

  addService (service, implementation) {
    assert(this._server, 'must be first init() server before server addService()')
    this._server.addService(service, implementation)
  }

  // 只支持传入一个方法
  addMiddleware (fn) {
    if (typeof fn !== 'function') throw new TypeError('grpcity loader server middleware must be a function!')
    debug('use %s', fn._name || fn.name || '-')
    this._middleware.push(fn)
  }

  // 支持传入方法数组或者一个方法
  addMiddlewares (fns) {
    if (Array.isArray(fns)) {
      fns.forEach(fn => {
        this.addMiddleware(fn)
      })
    } else {
      this.addMiddleware(fns)
    }
  }

  // 洋葱模型：提供 rpc method 中间件前后处理的能力
  _proxy (target, key) {
    const fn = compose(this._middleware)

    return async function (call) {
      const ctx = {
        // 上下文的补充
        // TODO: 可能需要更多上下文字段
        // method: target.constructor.name + '.' + key,
        path: call.call.handler.path || '',
        request: call.request
      }

      const handleResponse = async () => {
        ctx.response = await target[key](call)
      }

      await fn(ctx, handleResponse).catch(err => {
        if (typeof err.stack === 'string') {
          const stack = err.stack.split('\n')
          err.message += ` [Error Message From Server, stack: ${stack[1].trim()}]`
        } else {
          err.message += ' [Error Message From Server]'
        }
        throw new Error(err)
      })
      debug(key, JSON.stringify(ctx))

      return ctx.response
    }
  }
}

module.exports = new ServerProxy()
