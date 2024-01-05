import { createClientError } from './clientError'
import { combineMetadata } from './clientMetadata'
import { setDeadline } from './clientDeadline'
import { createContext } from './clientContext'
import { UntypedServiceImplementation, Metadata, StatusObject } from '@grpc/grpc-js'

export const clientStreamProxy = (
  client: UntypedServiceImplementation,
  func: any,
  defaultMetadata: Record<string, unknown>,
  defaultOptions: Record<string, unknown>,
  composeFunc: Function
) => {
  return async (metadata?: Metadata, options?: Record<string, unknown>): any => {
    if (typeof options === 'function') {
      throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
    } else if (typeof metadata === 'function') {
      throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
    }

    metadata = combineMetadata(metadata || new Metadata(), defaultMetadata)
    options = setDeadline(options, defaultOptions)

    const ctx = createContext({ metadata, options })

    const argumentsList: Array<any> = [metadata, options]
    argumentsList.push((err: any, response: any) => {
      if (err) {
        throw createClientError(err, metadata)
      }
      ctx.res.response = response
    })

    const call = func.apply(client, argumentsList)

    call.writeAll = (messages: any[]) => {
      if (Array.isArray(messages)) {
        messages.forEach((message) => {
          call.write(message)
        })
      }
    }

    const handler = async () => {
      call.end()
      await new Promise<void>((resolve, _) => {
        call.on('metadata', (metadata: Metadata) => {
          ctx.res.metadata = metadata
        })
        call.on('status', (status: StatusObject) => {
          ctx.res.status = status
          resolve()
        })
      })
    }

    call.writeEnd = async () => {
      await composeFunc(ctx, handler).catch((err: Error) => {
        throw createClientError(err, metadata)
      })
      return ctx.res
    }

    return call
  }
}
