import assert from 'node:assert'
import * as util from 'node:util'
import * as grpc from '@grpc/grpc-js'
import * as _ from 'lodash'
import * as Joi from 'joi'
import serverSchemas from '../schema/server'
import iterator from '../util/iterator'
import { compose, MiddlewareFunction } from '../util/compose'

class ServerProxy {
  private _middleware: MiddlewareFunction[]

  private _loader?: any
  private _server?: grpc.Server
  private _insecureServerCredentials?: grpc.ServerCredentials

  constructor() {
    this._middleware = []
  }

  _init(loader: any, ...args: any[]): this {
    if (!this._loader) {
      this._loader = loader
    }
    if (!this._server) {
      this._server = new grpc.Server(...args)
    }
    return this
  }

  async listen(addr: any, credentials: grpc.ServerCredentials | undefined = undefined): Promise<void> {
    assert(this._server, 'must be first init() server before server listen()')
    Joi.assert(addr, serverSchemas.address, 'server listen() params Error')

    const url = _.isString(addr) ? addr : `${addr.host}:${addr.port}`
    const bindPort = await new Promise<number>((resolve, reject) => {
      this._server!.bindAsync(url, credentials || this.makeServerCredentials(), (err, result) => (err ? reject(err) : resolve(result)))
    })
    const port = addr.port ? addr.port : Number(addr.match(/:(\d+)/)![1])
    assert(bindPort === port, 'server bind port not to be right')

    this._server!.start()
  }

  async shutdown(): Promise<void> {
    if (!this._server) {
      return
    }

    await new Promise<void>((resolve, reject) => {
      this._server!.tryShutdown((err) => {
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

  forceShutdown(): void {
    if (!this._server) {
      return
    }

    this._server!.forceShutdown()
    delete this._server
    delete this._loader
  }

  makeServerCredentials(rootCerts?: Buffer, keyCertPairs?: grpc.KeyCertPair[], checkClientCertificate?: boolean): grpc.ServerCredentials {
    if (rootCerts && keyCertPairs) {
      return grpc.ServerCredentials.createSsl(rootCerts, keyCertPairs, checkClientCertificate)
    } else {
      if (!this._insecureServerCredentials) {
        this._insecureServerCredentials = grpc.ServerCredentials.createInsecure()
      }
      return this._insecureServerCredentials
    }
  }

  addService(name: string, implementation: any, { exclude = [], inherit }: { exclude?: string[]; inherit?: any } = {}): void {
    const service = this._loader.service(name)

    const options: any = { exclude, inherit, _implementationType: {} }
    Object.keys(service).forEach((key) => {
      const { requestStream, responseStream } = service[key]
      options._implementationType[service[key].originalName] = {
        requestStream,
        responseStream
      }
    })

    this._server!.addService(service, this._callbackify(implementation, options))
  }

  removeService(name: string): void {
    assert(this._server, 'must be first init() server before server removeService()')
    this._server!.removeService(this._loader.service(name))
  }

  addMiddleware(...args: MiddlewareFunction[]): void {
    assert(args.length >= 1, 'server addMiddleware() takes at least one argument.')
    if (args.length === 1) {
      if (Array.isArray(args[0])) {
        args[0].forEach((fn) => {
          this._use(fn)
        })
      } else {
        this._use(args[0])
      }
    } else {
      args.forEach((fn) => {
        this._use(fn)
      })
    }
  }

  private _use(fn: MiddlewareFunction): void {
    if (typeof fn !== 'function') throw new TypeError('grpcity loader server middleware must be a function!')
    this._middleware.push(fn)
  }

  private _callbackify(target: any, { exclude = [], inherit, _implementationType }: { exclude?: string[]; inherit?: any; _implementationType: any }): any {
    assert(typeof target === 'object', 'Must callbackify an object')
    assert(Array.isArray(exclude), 'options.exclude must be an array of strings')

    const protoPropertyNames = Object.getOwnPropertyNames(Object.getPrototypeOf({}))
    exclude.push(...protoPropertyNames)

    const allPropertyNames = [
      ...new Set([...Object.keys(target), ...Object.getOwnPropertyNames(Object.getPrototypeOf(target)), ...(inherit && inherit.prototype ? Object.getOwnPropertyNames(inherit.prototype) : [])])
    ]

    const methods: { [key: string]: any } = {}
    for (const key of allPropertyNames) {
      const fn = target[key]
      if (typeof fn === 'function' && key !== 'constructor' && !exclude.includes(key)) {
        if (util.types.isAsyncFunction(fn)) {
          const eglWrapFunction = this._proxy(target, key, _implementationType[key])
          methods[key] = eglWrapFunction
        } else {
          methods[key] = fn
        }
      }
    }

    return methods
  }

  private _proxy(target: any, key: string, options: any = {}): any {
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

  private _createContext(call: any): any {
    return {
      // TODO: maybe need more details
      // method: target.constructor.name + '.' + key,
      path: call.call.handler.path || '',
      request: call.request,
      metadata: call.metadata.clone()
    }
  }

  private _callUnaryProxyMethod(target: any, key: string, composeFunc: Function): grpc.handleUnaryCall<any, any> {
    return (call, callback) => {
      const ctx = this._createContext(call)

      Promise.resolve().then(async () => {
        const handleResponse = async () => {
          ctx.response = await target[key](call)
        }
        await composeFunc(ctx, handleResponse).catch((err: Error) => {
          callback(this._createInternalErrorStatus(err))
        })
        callback(null, ctx.response)
      })
    }
  }

  private _callClientStreamProxyMethod(target: any, key: string, composeFunc: Function): any {
    return (call: any, callback: Function) => {
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
        await composeFunc(ctx, handleResponse).catch((err: Error) => {
          callback(this._createInternalErrorStatus(err))
        })
        callback(null, ctx.response)
      })
    }
  }

  private _callServerStreamProxyMethod(target: any, key: string, composeFunc: Function): any {
    return (call: any) => {
      const ctx = this._createContext(call)

      call.writeAll = (messages: any[]) => {
        if (Array.isArray(messages)) {
          messages.forEach((message) => {
            call.write(message)
          })
        }
      }
      call.writeEnd = call.end

      Promise.resolve().then(async () => {
        const handleResponse = async () => {
          await target[key](call)
        }
        await composeFunc(ctx, handleResponse).catch((err: Error) => {
          call.destroy(this._createInternalErrorStatus(err))
        })
        call.end()
      })
    }
  }

  private _callDuplexStreamProxyMethod(target: any, key: string, composeFunc: Function): any {
    return (call: any) => {
      const ctx = this._createContext(call)

      call.writeAll = (messages: any[]) => {
        if (Array.isArray(messages)) {
          messages.forEach((message) => {
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
        await composeFunc(ctx, handleResponse).catch((err: Error) => {
          call.destroy(this._createInternalErrorStatus(err))
        })
        call.end()
      })
    }
  }

  private _createInternalErrorStatus(err: any): any {
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

export default ServerProxy
