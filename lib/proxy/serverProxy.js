const grpc = require('@grpc/grpc-js')
const assert = require('assert')
const util = require('util')
const _ = require('lodash')
const Joi = require('joi')
const serverSchemas = require('../schema/server')
const iterator = require('../util/iterator')
const compose = require('../util/compose')
const debug = require('debug')('grpcity:serverProxy')

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
    Joi.assert(addr, serverSchemas.address, 'server listen() params Error')
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

  removeService (name) {
    assert(this._server, 'must be first init() server before server removeService()')
    this._server.removeService(this._loader.service(name))
  }

  addMiddleware (...args) {
    assert(args.length >= 1, 'server addMiddleware() takes at least one argument.')
    if (args.length === 1) {
      if (Array.isArray(args[0])) {
        args[0].forEach(fn => {
          this._use(fn)
        })
      } else {
        this._use(args[0])
      }
    } else {
      args.forEach(fn => {
        this._use(fn)
      })
    }
  }

  _use (fn) {
    if (typeof fn !== 'function') throw new TypeError('grpcity loader server middleware must be a function!')
    this._middleware.push(fn)
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
          const eglWrapFunction = this._proxy(target, key, _implementationType[key])
          debug(`callbackify async function: ${key}`)
          methods[key] = eglWrapFunction
        } else {
          debug(`copy non-async function: ${key}`)
          methods[key] = fn
        }
      }
    }

    debug('callbackify()', methods)
    return methods
  }

  _proxy (target, key, options = {}) {
    const { requestStream, responseStream } = options

    const fn = compose(this._middleware)

    // unary
    if (!requestStream && !responseStream) {
      return this._callUnaryProxyMethod(target, key, fn)
    }
    // client stream
    if (requestStream && !responseStream) {
      return this._callClientStreamProxyMethod(target, key, fn)
    }
    // server stream
    if (!requestStream && responseStream) {
      return this._callServerStreamProxyMethod(target, key, fn)
    }
    // duplex stream
    if (requestStream && responseStream) {
      return this._callDuplexStreamProxyMethod(target, key, fn)
    }
  }

  _createContext (call) {
    return {
      // TODO: maybe need more details
      // method: target.constructor.name + '.' + key,
      path: call.call.handler.path || '',
      request: call.request,
      metadata: call.metadata.clone()
    }
  }

  _callUnaryProxyMethod (target, key, composeFunc) {
    return (call, callback) => {
      const ctx = this._createContext(call)

      Promise.resolve().then(async () => {
        const handleResponse = async () => {
          ctx.response = await target[key](call)
        }
        await composeFunc(ctx, handleResponse).catch(err => {
          callback(this._createInternalErrorStatus(err))
        })
        callback(null, ctx.response)
      })
    }
  }

  _callClientStreamProxyMethod (target, key, composeFunc) {
    return (call, callback) => {
      const ctx = this._createContext(call)

      call.readAll = () => {
        return iterator(call, 'data', {
          resolutionEvents: ['end']
        })
      }

      Promise.resolve().then(async () => {
        const handleResponse = async () => {
          ctx.response = await target[key](call)
        }
        await composeFunc(ctx, handleResponse).catch(err => {
          callback(this._createInternalErrorStatus(err))
        })
        callback(null, ctx.response)
      })
    }
  }

  _callServerStreamProxyMethod (target, key, composeFunc) {
    return (call) => {
      const ctx = this._createContext(call)

      call.writeAll = (messages) => {
        if (Array.isArray(messages)) {
          messages.forEach(message => {
            call.write(message)
          })
        }
      }
      call.writeEnd = call.end

      Promise.resolve().then(async () => {
        const handleResponse = async () => {
          await target[key](call)
        }
        await composeFunc(ctx, handleResponse).catch(err => {
          call.destroy(this._createInternalErrorStatus(err))
        })
        call.end()
      })
    }
  }

  _callDuplexStreamProxyMethod (target, key, composeFunc) {
    return (call) => {
      const ctx = this._createContext(call)

      call.writeAll = (messages) => {
        if (Array.isArray(messages)) {
          messages.forEach(message => {
            call.write(message)
          })
        }
      }
      call.readAll = () => {
        return iterator(call, 'data', {
          resolutionEvents: ['end']
        })
      }

      Promise.resolve().then(async () => {
        const handleResponse = async () => {
          await target[key](call)
        }
        await composeFunc(ctx, handleResponse).catch(err => {
          call.destroy(this._createInternalErrorStatus(err))
        })
        call.end()
      })
    }
  }

  _createInternalErrorStatus (err) {
    err.code = err.code || 13
    if (typeof err.stack === 'string') {
      const stack = err.stack.split('\n')
      err.messages += ` [Error Message From Server, stack: ${stack[1].trim()}]`
    } else {
      err.messages += ' [Error Message From Server]'
    }
    return err
  }
}

module.exports = new ServerProxy()
