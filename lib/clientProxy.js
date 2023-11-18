const { Metadata } = require('@grpc/grpc-js')
const os = require('os')
const pEvent = require('p-event')

const debug = require('debug')('grpcity:clientProxy')

class ClientProxy {
  _proxy (client, defaultOptions = { }, appName = undefined) {
    defaultOptions = defaultOptions || {}
    defaultOptions.timeout = defaultOptions.timeout || 1000 * 10

    const prototype = Object.getPrototypeOf(client)

    const methodNames = Object.keys(prototype)
      .filter(key => prototype[key] && prototype[key].path)
      .reduce((names, key) => {
        names[key.toUpperCase()] = prototype[key].path
        return names
      }, {})

    const basicMeta = { hostname: os.hostname(), appName }

    const target = Object.entries(prototype).filter(([name, func]) => {
      return name !== 'constructor' && typeof func === 'function'
    }).reduce((target, [name, func]) => {
      basicMeta.fullServiceName = `${methodNames[name.toUpperCase()]}`
      debug('proxy method', basicMeta)

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

      return target
    }, { call: {} })

    return target
  }

  _getFuncStreamWay (func) {
    const { requestStream, responseStream } = func
    return { requestStream, responseStream }
  }

  _promisifyUnaryMethod (client, func, defaultOptions, basicMeta) {
    const asyncUnaryMethod = async (request, metadata, options) => {
      if (typeof options === 'function') {
        throw new Error('gRPCity: AsyncFunction should not contain callback function')
      } else if (typeof metadata === 'function') {
        throw new Error('gRPCity: AsyncFunction should not contain callback function')
      }

      [metadata, options] = this._prepareMetadata(metadata, options, basicMeta)
      options = this._setDeadline(options, defaultOptions, basicMeta)

      return new Promise((resolve, reject) => {
        const result = {}
        const argumentsList = [request, metadata, options]
        argumentsList.push((err, response) => {
          if (err) {
            reject(this._handlerError(err, basicMeta))
          }
          debug('unaryMethod get response', response)
          result.response = response
        })

        const call = func.apply(client, argumentsList)

        call.on('metadata', metadata => {
          debug('unaryMethod get metadata', metadata)
          result.metadata = metadata
        })
        call.on('status', status => {
          debug('unaryMethod get status', status)
          result.status = status
          resolve(result)
        })
      })
    }
    return asyncUnaryMethod
  }

  _promisifyClientStreamMethod (client, func, defaultOptions, basicMeta) {
    const clientStreamMethod = (metadata, options) => {
      if (typeof options === 'function') {
        throw new Error('gRPCity: asyncStreamFunction should not contain callback function')
      } else if (typeof metadata === 'function') {
        throw new Error('gRPCity: asyncStreamFunction should not contain callback function')
      }

      [metadata, options] = this._prepareMetadata(metadata, options, basicMeta)
      options = this._setDeadline(options, defaultOptions, basicMeta)

      const result = {}

      const argumentsList = [metadata, options]
      argumentsList.push((err, response) => {
        if (err) {
          throw this._handlerError(err, basicMeta)
        }
        debug('clientStreamMethod get response', response)
        result.response = response
      })

      const call = func.apply(client, argumentsList)

      // write() already exists in call
      // call.write = call.write

      call.writeAll = (messages) => {
        if (Array.isArray(messages)) {
          messages.forEach(message => {
            call.write(message)
          })
        }
      }
      call.writeEnd = async () => {
        call.end()
        await new Promise((resolve, reject) => {
          call.on('metadata', metadata => {
            debug('clientStreamMethod get metadata', metadata)
            result.metadata = metadata
          })
          call.on('status', status => {
            debug('clientStreamMethod get status', status)
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

  _promisifyServerStreamMethod (client, func, defaultOptions, basicMeta) {
    const serverStreamMethod = (request, metadata, options) => {
      if (typeof options === 'function') {
        throw new Error('gRPCity: asyncStreamFunction should not contain callback function')
      } else if (typeof metadata === 'function') {
        throw new Error('gRPCity: asyncStreamFunction should not contain callback function')
      }

      [metadata, options] = this._prepareMetadata(metadata, options, basicMeta)
      options = this._setDeadline(options, defaultOptions, basicMeta)

      const call = func.apply(client, [request, metadata, options])

      call.on('error', err => {
        throw this._handlerError(err, basicMeta)
      })

      const result = {}
      call.readAll = () => {
        call.on('metadata', metadata => {
          debug('serverStreamMethod get metadata', metadata)
          result.metadata = metadata
        })
        call.on('status', status => {
          debug('serverStreamMethod get status', status)
          result.status = status
        })
        return pEvent.iterator(call, 'data', {
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

  _promisifyDuplexStreamMethod (client, func, defaultOptions, basicMeta) {
    const duplexStreamMethod = (metadata, options) => {
      if (typeof options === 'function') {
        throw new Error('gRPCity: asyncStreamFunction should not contain callback function')
      } else if (typeof metadata === 'function') {
        throw new Error('gRPCity: asyncStreamFunction should not contain callback function')
      }

      [metadata, options] = this._prepareMetadata(metadata, options, basicMeta)
      options = this._setDeadline(options, defaultOptions, basicMeta)

      const call = func.apply(client, [metadata, options])

      // write() already exists in call
      // call.write = call.write

      call.writeAll = (messages) => {
        if (Array.isArray(messages)) {
          messages.forEach(message => {
            call.write(message)
          })
        }
      }
      call.writeEnd = call.end

      call.on('error', err => {
        throw this._handlerError(err, basicMeta)
      })

      // readAll() needs to execute writeAll() or write() first before it can be executed
      const result = {}
      call.readAll = () => {
        call.on('metadata', metadata => {
          debug('serverStreamMethod get metadata', metadata)
          result.metadata = metadata
        })
        call.on('status', status => {
          debug('serverStreamMethod get status', status)
          result.status = status
        })
        return pEvent.iterator(call, 'data', {
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

  _keepCallbackMethod (client, func) {
    const callbackMethod = (...argumentsList) => {
      return func.apply(client, argumentsList)
    }
    return callbackMethod
  }

  _prepareMetadata (metadata, options, basicMeta) {
    if (metadata instanceof Metadata) {
      options = Object.assign({}, options)
    } else {
      options = Object.assign({}, metadata)
      metadata = new Metadata()
    }

    metadata.add('x-client-hostname', basicMeta.hostname)

    if (basicMeta.appName) {
      metadata.add('x-client-app-name', basicMeta.appName)
    }

    return [metadata, options]
  }

  _handlerError (err, basicMeta) {
    const newError = new Error()
    newError.name = 'GrpcClientError'
    newError.code = err.code
    newError.message = `${basicMeta.fullServiceName} (${err.message})`

    const stacks = newError.stack.split('\n')
    newError.stack = [
      stacks[0],
      ...stacks.slice(2),
      '    ...',
      ...err.stack.split('\n').slice(1, 3)
    ].join('\n')

    return newError
  }

  _setDeadline (options, defaultOptions, basicMeta) {
    if (!options.deadline) {
      const timeout = options.timeout || defaultOptions.timeout
      const deadline = new Date(Date.now() + timeout)
      options.deadline = deadline
      delete options.timeout
      debug('grpc client request will timeout at', { fullServiceName: basicMeta.fullServiceName, deadline })
    }
    return options
  }
}

module.exports = new ClientProxy()
