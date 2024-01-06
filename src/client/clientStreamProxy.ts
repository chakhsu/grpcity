import { createClientError } from './clientError'
import { combineMetadata } from './clientMetadata'
import { setDeadline } from './clientDeadline'
import { createContext, createResponse } from './clientContext'
import { UntypedServiceImplementation, Metadata, StatusObject } from '@grpc/grpc-js'

export const clientStreamProxy = (
  client: UntypedServiceImplementation,
  func: any,
  composeFunc: Function,
  defaultMetadata: Record<string, unknown>,
  defaultOptions: Record<string, unknown>,
  methodOptions: { requestStream: boolean; responseStream: boolean }
) => {
  return async (metadata?: Metadata, options?: Record<string, unknown>): Promise<any> => {
    if (typeof options === 'function') {
      throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
    } else if (typeof metadata === 'function') {
      throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
    }

    metadata = combineMetadata(metadata || new Metadata(), defaultMetadata)
    options = setDeadline(options, defaultOptions)

    const ctx = createContext({ metadata, options, methodOptions })

    let ctxMetadata = ctx.method.metadata
    let ctxOptions = ctx.method.options
    const argumentsList: Array<any> = [ctxMetadata, ctxOptions]
    argumentsList.push((err: any, response: any) => {
      if (err) {
        throw createClientError(err, ctxMetadata)
      }
      ctx.response = response
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
          ctx.metadata = metadata
        })
        call.on('status', (status: StatusObject) => {
          ctx.status = status
          resolve()
        })
      })
    }

    call.writeEnd = async () => {
      await composeFunc(ctx, handler).catch((err: Error) => {
        throw createClientError(err, metadata)
      })
      return createResponse(ctx)
    }

    return call
  }
}
