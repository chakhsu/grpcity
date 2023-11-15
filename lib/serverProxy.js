const grpc = require('@grpc/grpc-js')
const assert = require('assert')
const util = require('util')
const compose = require('koa-compose')
const _ = require('lodash')
const Joi = require('joi')
const debug = require('debug')('grpcity:serverProxy')

const addressSchema = Joi.alternatives([
  Joi.string().regex(/:/, 'host and port like 127.0.0.1:9090'),
  Joi.object().keys({
    host: Joi.string().required(),
    port: Joi.number().integer().min(0).max(65535).required()
  })
])

class ServerProxy {
  constructor () {
    this._middleware = []
  }

  _init (loader, ...args) {
    if (!this._loader) {
      this._loader = loader
    }
    if (!this._server) {
      this._server = new grpc.Server(...args)
    }
    return this
  }

  async listen (addr, credentials = undefined) {
    assert(this._server, 'must be first init() server before server listen()')
    Joi.assert(addr, addressSchema, 'server listen() params Error')
    debug('server listen options', addr)

    const url = _.isString(addr) ? addr : `${addr.host}:${addr.port}`
    const bindPort = await new Promise((resolve, reject) => {
      this._server.bindAsync(url, credentials || this.makeServerCredentials(), (err, result) => (
        err ? reject(err) : resolve(result))
      )
    })
    const port = addr.port ? addr.port : Number(addr.match(/:(\d+)/)[1])
    assert(bindPort === port, 'server bind port not to be right')

    this._server.start()
  }

  async shutdown () {
    if (!this._server) {
      return
    }

    await new Promise((resolve, reject) => {
      this._server.tryShutdown(err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })

    delete this._server
    delete this._loader
  }

  forceShutdown () {
    if (!this._server) {
      return
    }

    this._server.forceShutdown()
    delete this._server
    delete this._loader
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

  addService (name, implementation, { exclude = [], inherit } = {}) {
    const service = this._loader.service(name)

    const options = { exclude, inherit, _implementationType: {} }
    Object.keys(service).forEach(key => {
      const { requestStream, responseStream } = service[key]
      options._implementationType[service[key].originalName] = { requestStream, responseStream }
    })

    this._server.addService(service, this._callbackify(implementation, options))
  }

  // async func --- to --> callback type func
  // use in grpc server side mostly
  _callbackify (target, { exclude = [], inherit, _implementationType } = {}) {
    assert(typeof target === 'object', 'Must callbackify an object')
    assert(Array.isArray(exclude), 'options.exclude must be an array of strings')

    const protoPropertyNames = Object.getOwnPropertyNames(Object.getPrototypeOf({}))
    exclude.push(...protoPropertyNames)

    const allPropertyNames = [
      ...new Set([
        ...Object.keys(target),
        ...Object.getOwnPropertyNames(Object.getPrototypeOf(target)),
        ...(inherit && inherit.prototype ? Object.getOwnPropertyNames(inherit.prototype) : [])
      ])
    ]

    const methods = {}
    for (const key of allPropertyNames) {
      const fn = target[key]
      if (typeof fn === 'function' && key !== 'constructor' && !exclude.includes(key)) {
        if (util.types.isAsyncFunction(fn)) {
          const eglWrapFunction = this._proxy(target, key, _implementationType)
          debug(`callbackify async function: ${key}`)
          methods[key] = util.callbackify(eglWrapFunction).bind(target)
        } else {
          debug(`copy non-async function: ${key}`)
          methods[key] = fn.bind(target)
        }
      }
    }

    debug('callbackify()', methods)
    return methods
  }

  removeService (name) {
    assert(this._server, 'must be first init() server before server removeService()')
    this._server.removeService(this._loader.service(name))
  }

  // 只支持传入一个方法
  addMiddleware (fn) {
    if (typeof fn !== 'function') throw new TypeError('grpcity loader server middleware must be a function!')
    debug('addMiddleware %s', fn._name || fn.name || '-')
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
  _proxy (target, key, options) {
    const fn = compose(this._middleware)

    return async (call) => {
      const ctx = {
        // 上下文的补充
        // TODO: 可能需要更多上下文字段
        // method: target.constructor.name + '.' + key,
        path: call.call.handler.path || '',
        request: call.request,
        metadata: call.metadata.clone()
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
