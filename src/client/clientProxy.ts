import os from 'node:os'
import { callbackProxy } from './callbackProxy'
import { unaryProxy } from './unaryProxy'
import { clientStreamProxy } from './clientStreamProxy'
import { serverStreamProxy } from './serverStreamProxy'
import { bidiStreamProxy } from './bidiStreamProxy'
import type { UntypedServiceImplementation } from '@grpc/grpc-js'

const getFuncStreamType = (func: any) => {
  const { requestStream, responseStream } = func
  return { requestStream, responseStream }
}

export const clientProxy = (client: UntypedServiceImplementation, options: Record<string, any>) => {
  const prototype = Object.getPrototypeOf(client)
  const methodNames: any = Object.keys(prototype)
    .filter((key) => prototype[key] && prototype[key].path)
    .reduce((names: any, key) => {
      names[key.toUpperCase()] = prototype[key].path
      return names
    }, {})

  const metadata: Record<string, any> = {
    'x-client-hostname': os.hostname()
  }

  const target = Object.entries(prototype).reduce(
    (target: any, [name, func]) => {
      if (name !== 'constructor' && typeof func === 'function') {
        metadata['x-service-path'] = `${methodNames[name.toUpperCase()]}`

        const { requestStream, responseStream } = getFuncStreamType(func)

        if (!requestStream && !responseStream) {
          // promisify unary method
          target[name] = unaryProxy(client, func, metadata, options)
        }

        // stream
        if (requestStream && !responseStream) {
          // promisify only client stream method
          target[name] = clientStreamProxy(client, func, metadata, options)
        }
        if (!requestStream && responseStream) {
          // promisify only server stream method
          target[name] = serverStreamProxy(client, func, metadata, options)
        }
        if (requestStream && responseStream) {
          // promisify duplex stream method
          target[name] = bidiStreamProxy(client, func, metadata, options)
        }

        // keep callback method
        target.call[name] = callbackProxy(client, func)
      }

      return target
    },
    { call: {} }
  )

  return target
}
