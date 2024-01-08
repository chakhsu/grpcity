import assert from 'node:assert'
import * as grpc from '@grpc/grpc-js'
import { isString } from '../utils/string'

import { assignServerOptions } from '../schema/server'
import { ProtoLoader } from '../loader'
import { callbackify } from './callbackify'
import type { ServerOptions } from '../schema/loader'
import type { MiddlewareFunction } from '../utils/compose'
import type { CallbackifyOptions } from './callbackify'

export default class Server {
  private _middleware: MiddlewareFunction[] = []
  private _loader?: ProtoLoader
  private _server?: grpc.Server

  constructor(loader: ProtoLoader, options?: ServerOptions) {
    this._loader = loader
    if (!this._loader) {
      this._loader = loader
    }
    if (!this._server) {
      const serverOptions = assignServerOptions(options)
      this._server = new grpc.Server(serverOptions)
    }
  }

  async listen(addr: string | { host: string; port: number }, credentials?: grpc.ServerCredentials): Promise<void> {
    assert(this._server, 'must be first init() server before server listen()')

    const url = isString(addr) ? (addr as string) : `${(addr as any).host}:${(addr as any).port}`
    const bindPort = await new Promise<number>((resolve, reject) => {
      this._server!.bindAsync(url, credentials || (this._loader as ProtoLoader).makeServerCredentials(), (err, result) =>
        err ? reject(err) : resolve(result)
      )
    })
    const port = (addr as any).port ? (addr as any).port : Number((addr as string).match(/:(\d+)/)![1])
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

  add(name: string, implementation: any, { exclude = [], inherit }: { exclude?: string[]; inherit?: any } = {}): void {
    const service = (this._loader as ProtoLoader).service(name)

    const options: CallbackifyOptions = { exclude, inherit, _implementationType: {} }
    Object.keys(service).forEach((key) => {
      const { requestStream, responseStream } = service[key]
      options._implementationType[service[key].originalName as string] = {
        requestStream,
        responseStream
      }
    })

    this._server!.addService(service, callbackify(implementation, this._middleware, options))
  }

  remove(name: string): void {
    this._server!.removeService((this._loader as ProtoLoader).service(name))
  }

  use(...args: MiddlewareFunction[]): void {
    assert(args.length >= 1, 'server use() takes at least one middleware.')
    if (args.length === 1) {
      if (Array.isArray(args[0])) {
        args[0].forEach((fn) => {
          this._middleware.push(fn)
        })
      } else {
        this._middleware.push(args[0])
      }
    } else {
      args.forEach((fn) => {
        this._middleware.push(fn)
      })
    }
  }
}
