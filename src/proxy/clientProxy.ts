import { Metadata, MetadataValue, UntypedServiceImplementation } from '@grpc/grpc-js'
import * as os from 'node:os'
import iterator from '../util/iterator'

class ClientProxy {
  private _getFuncStreamWay(func: any): {
    requestStream: boolean
    responseStream: boolean
  } {
    const { requestStream, responseStream } = func
    return { requestStream, responseStream }
  }

  private _prepareMetadata(metadata: Metadata | Record<string, unknown>, options: Record<string, unknown>, basicMeta: Record<string, unknown>): [Metadata, Record<string, unknown>] {
    if (metadata instanceof Metadata) {
      options = { ...options }
    } else {
      options = { ...metadata }
      metadata = new Metadata()
    }

    if (basicMeta.hostname) {
      metadata.add('x-client-hostname', basicMeta.hostname as MetadataValue)
    }

    if (basicMeta.appName) {
      metadata.add('x-client-app-name', basicMeta.appName as MetadataValue)
    }

    return [metadata, options]
  }

  private _handlerError(err: any, basicMeta: Record<string, unknown>) {
    const newError = new Error() as {
      name: string
      code: string
      message: string
      stack: string
    }

    newError.name = 'GrpcClientError'
    newError.code = err.code
    newError.message = `${basicMeta.fullServiceName} (${err.message})`

    const stacks = newError.stack!.split('\n')
    newError.stack = [stacks[0], ...stacks.slice(2), '    ...', ...(err.stack!.split('\n').slice(1, 3) as string[])].join('\n')

    return newError
  }

  private _setDeadline(options: { deadline?: Date; timeout?: number }, defaultOptions: Record<string, unknown>, basicMeta: { fullServiceName?: string }): { deadline?: Date } {
    if (!options.deadline) {
      const timeout = options.timeout || defaultOptions.timeout
      const deadline = new Date(Date.now() + (timeout as number))
      options.deadline = deadline
      delete options.timeout
    }
    return options
  }

  private _promisifyUnaryMethod(client: UntypedServiceImplementation, func: any, defaultOptions: Record<string, unknown>, basicMeta: Record<string, unknown>): any {
    const asyncUnaryMethod = async (request: any, metadata: Metadata, options: Record<string, unknown>): Promise<any> => {
      if (typeof options === 'function') {
        throw new Error('gRPCity: AsyncFunction should not contain a callback function')
      } else if (typeof metadata === 'function') {
        throw new Error('gRPCity: AsyncFunction should not contain a callback function')
      }

      ;[metadata, options] = this._prepareMetadata(metadata, options, basicMeta)
      options = this._setDeadline(options, defaultOptions, basicMeta)

      return new Promise((resolve, reject) => {
        const result: { response?: any; metadata?: any; status?: any } = {}
        const argumentsList: Array<any> = [request, metadata, options]
        argumentsList.push((err: any, response: any) => {
          if (err) {
            reject(this._handlerError(err, basicMeta))
          }
          result.response = response
        })

        const call = func.apply(client, argumentsList)

        call.on('metadata', (metadata: any) => {
          result.metadata = metadata
        })
        call.on('status', (status: any) => {
          result.status = status
          resolve(result)
        })
      })
    }
    return asyncUnaryMethod
  }

  private _promisifyClientStreamMethod(client: UntypedServiceImplementation, func: any, defaultOptions: Record<string, unknown>, basicMeta: Record<string, unknown>): any {
    const clientStreamMethod = (metadata: Metadata, options: Record<string, unknown>): any => {
      if (typeof options === 'function') {
        throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
      } else if (typeof metadata === 'function') {
        throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
      }

      ;[metadata, options] = this._prepareMetadata(metadata, options, basicMeta)
      options = this._setDeadline(options, defaultOptions, basicMeta)

      const result: { response?: any; metadata?: any; status?: any } = {}

      const argumentsList: Array<any> = [metadata, options]
      argumentsList.push((err: any, response: any) => {
        if (err) {
          throw this._handlerError(err, basicMeta)
        }
        result.response = response
      })

      const call = func.apply(client, argumentsList)

      call.writeAll = (messages: any[]) => {
        if (Array.isArray(messages)) {
          messages.forEach((message) => {
            call.write(message)
          })
        }
      }
      call.writeEnd = async () => {
        call.end()
        await new Promise<void>((resolve, reject) => {
          call.on('metadata', (metadata: any) => {
            result.metadata = metadata
          })
          call.on('status', (status: any) => {
            result.status = status
            resolve()
          })
        })
        return result
      }

      return call
    }

    return clientStreamMethod
  }

  private _promisifyServerStreamMethod(client: UntypedServiceImplementation, func: any, defaultOptions: Record<string, unknown>, basicMeta: { fullServiceName?: string }): any {
    const serverStreamMethod = (request: any, metadata: Metadata, options: Record<string, unknown>): any => {
      if (typeof options === 'function') {
        throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
      } else if (typeof metadata === 'function') {
        throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
      }

      ;[metadata, options] = this._prepareMetadata(metadata, options, basicMeta)
      options = this._setDeadline(options, defaultOptions, basicMeta)

      const call = func.apply(client, [request, metadata, options])

      call.on('error', (err: Error) => {
        throw this._handlerError(err, basicMeta)
      })

      const result: { metadata?: any; status?: any } = {}
      call.readAll = () => {
        call.on('metadata', (metadata: any) => {
          result.metadata = metadata
        })
        call.on('status', (status: any) => {
          result.status = status
        })
        return iterator(call, 'data', {
          resolutionEvents: ['status', 'end']
        })
      }
      call.readEnd = () => {
        return result
      }

      return call
    }

    return serverStreamMethod
  }

  private _promisifyDuplexStreamMethod(client: UntypedServiceImplementation, func: any, defaultOptions: Record<string, unknown>, basicMeta: { fullServiceName?: string }): any {
    const duplexStreamMethod = (metadata: Metadata, options: Record<string, unknown>): any => {
      if (typeof options === 'function') {
        throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
      } else if (typeof metadata === 'function') {
        throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
      }

      ;[metadata, options] = this._prepareMetadata(metadata, options, basicMeta)
      options = this._setDeadline(options, defaultOptions, basicMeta)

      const call = func.apply(client, [metadata, options])

      call.writeAll = (messages: any[]) => {
        if (Array.isArray(messages)) {
          messages.forEach((message) => {
            call.write(message)
          })
        }
      }
      call.writeEnd = call.end

      call.on('error', (err: Error) => {
        throw this._handlerError(err, basicMeta)
      })

      const result: { metadata?: any; status?: any } = {}
      call.readAll = () => {
        call.on('metadata', (metadata: any) => {
          result.metadata = metadata
        })
        call.on('status', (status: any) => {
          result.status = status
        })
        return iterator(call, 'data', {
          resolutionEvents: ['status', 'end']
        })
      }
      call.readEnd = () => {
        return result
      }

      return call
    }

    return duplexStreamMethod
  }

  private _keepCallbackMethod(client: UntypedServiceImplementation, func: any): (...argumentsList: any[]) => any {
    const callbackMethod = (...argumentsList: any[]) => {
      return func.apply(client, argumentsList)
    }
    return callbackMethod
  }

  _proxy(client: UntypedServiceImplementation, defaultOptions: Record<string, any> = {}, appName?: string): any {
    defaultOptions = defaultOptions || {}
    defaultOptions.timeout = defaultOptions.timeout || 1000 * 10

    const prototype = Object.getPrototypeOf(client)

    const methodNames: any = Object.keys(prototype)
      .filter((key) => prototype[key] && prototype[key].path)
      .reduce((names: any, key) => {
        names[key.toUpperCase()] = prototype[key].path
        return names
      }, {})

    const basicMeta: Record<string, unknown> = {
      hostname: os.hostname(),
      appName
    }

    const target = Object.entries(prototype).reduce(
      (target: any, [name, func]) => {
        if (name !== 'constructor' && typeof func === 'function') {
          basicMeta.fullServiceName = `${methodNames[name.toUpperCase()]}`

          const { requestStream, responseStream } = this._getFuncStreamWay(func)

          if (!requestStream && !responseStream) {
            // promisify unary method
            target[name] = this._promisifyUnaryMethod(client, func, defaultOptions, basicMeta)
          }

          // stream
          if (requestStream && !responseStream) {
            // promisify only client stream method
            target[name] = this._promisifyClientStreamMethod(client, func, defaultOptions, basicMeta)
          }
          if (!requestStream && responseStream) {
            // promisify only server stream method
            target[name] = this._promisifyServerStreamMethod(client, func, defaultOptions, basicMeta)
          }
          if (requestStream && responseStream) {
            // promisify duplex stream method
            target[name] = this._promisifyDuplexStreamMethod(client, func, defaultOptions, basicMeta)
          }

          // keep callback method
          target.call[name] = this._keepCallbackMethod(client, func)
        }

        return target
      },
      { call: {} }
    )

    return target
  }
}

export default new ClientProxy()
