import { createClientError } from './clientError'
import { combineMetadata } from './clientMetadata'
import { setDeadline } from './clientDeadline'
import { createContext, createResponse, ClientResponse } from './clientContext'
import { UntypedServiceImplementation, Metadata, StatusObject, ClientWritableStream } from '@grpc/grpc-js'
import type { ComposedMiddleware } from '../utils/compose'

export type ClientWritableStreamCall = ClientWritableStream<any> & {
  writeAll: (message: any[]) => void
  writeEnd: () => Promise<ClientResponse>
}

export const clientStreamProxy = (
  client: UntypedServiceImplementation,
  func: any,
  composeFunc: ComposedMiddleware,
  defaultMetadata: Record<string, unknown>,
  defaultOptions: Record<string, unknown>,
  methodOptions: { requestStream: boolean; responseStream: boolean }
) => {
  return async (metadata?: Metadata, options?: Record<string, unknown>): Promise<ClientWritableStreamCall> => {
    if (typeof options === 'function') {
      throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
    } else if (typeof metadata === 'function') {
      throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
    }

    metadata = combineMetadata(metadata || new Metadata(), defaultMetadata)
    options = setDeadline(options, defaultOptions)

    const ctx = createContext({ metadata, options, methodOptions })

    const ctxMetadata = ctx.method.metadata
    const ctxOptions = ctx.method.options
    let callError: Error | null = null
    const argumentsList: Array<any> = [ctxMetadata, ctxOptions]
    argumentsList.push((err: any, response: any) => {
      if (err) {
        callError = createClientError(err, ctxMetadata)
        return
      }
      ctx.response = response
    })

    const call: ClientWritableStreamCall = func.apply(client, argumentsList)

    call.writeAll = (messages: any[]) => {
      if (Array.isArray(messages)) {
        messages.forEach((message) => {
          call.write(message)
        })
      }
    }

    const handler = async () => {
      call.end()
      await new Promise<void>((resolve) => {
        call.on('metadata', (metadata: Metadata) => {
          ctx.metadata = metadata
        })
        call.on('status', (status: StatusObject) => {
          ctx.status = status
          ctx.peer = call.getPeer()
          resolve()
        })
      })
    }

    call.writeEnd = async () => {
      await composeFunc(ctx, handler)
      if (callError) {
        throw callError
      }
      return createResponse(ctx)
    }

    return call
  }
}
