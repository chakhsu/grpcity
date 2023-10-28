const { Metadata } = require('@grpc/grpc-js')
const os = require('os')
const debug = require('debug')('grpcity:clientProxy')

class ClientProxy {
  proxy (client, defaultOptions = {}, appName = undefined) {
    defaultOptions = defaultOptions || {}
    defaultOptions.timeout = defaultOptions.timeout || 1000 * 10

    const hostname = os.hostname()
    const prototype = Object.getPrototypeOf(client)

    const methodNames = Object.keys(prototype).reduce((names, key) => {
      if (prototype[key] && prototype[key].path) {
        names[key.toUpperCase()] = prototype[key].path
      }
      return names
    }, {})

    const target = Object.entries(prototype).filter(([name, func]) => {
      return name !== 'constructor' && typeof func === 'function'
    }).reduce((target, [name, func]) => {
      const fullServiceName = `${methodNames[name.toUpperCase()]}`
      debug('proxy method', fullServiceName)

      const asyncFunc = async function (request, metadata, options) {
        if (typeof options === 'function') {
          throw new Error('gRPCity: AsyncFunction should not contain callback function')
        } else if (typeof metadata === 'function') {
          throw new Error('gRPCity: AsyncFunction should not contain callback function')
        }

        if (metadata instanceof Metadata) {
          options = Object.assign({}, options)
        } else {
          options = Object.assign({}, metadata)
          metadata = new Metadata()
        }

        metadata.add('x-client-hostname', hostname)
        if (appName) {
          metadata.add('x-client-app-name', appName)
        }

        if (!options.deadline) {
          const timeout = options.timeout || defaultOptions.timeout
          const deadline = new Date(Date.now() + timeout)
          options.deadline = deadline
          delete options.timeout
          debug('grpc client request will timeout at', { fullServiceName, deadline })
        }

        const outSideError = new Error()

        return new Promise((resolve, reject) => {
          const argumentsList = [request, metadata, options]
          argumentsList.push(function (err, response) {
            if (err) {
              outSideError.name = 'GrpcClientError'
              outSideError.code = err.code
              outSideError.message = `${fullServiceName} (${err.message})`
              const stacks = outSideError.stack.split('\n')

              outSideError.stack = [
                stacks[0],
                ...stacks.slice(2),
                '    ...',
                ...err.stack.split('\n').slice(1, 3)
              ].join('\n')
              reject(outSideError)
            }
            resolve(response)
          })
          func.apply(client, argumentsList)
        })
      }

      // 原方法放到 original 里
      if (!target.original) {
        target.original = {}
      }
      target.original[name] = function (...argumentsList) {
        return func.apply(client, argumentsList)
      }

      target[name] = asyncFunc

      return target
    }, { async: {} })

    return target
  }
}

module.exports = new ClientProxy()
