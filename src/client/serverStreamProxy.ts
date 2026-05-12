import { createClientError } from './clientError'
import { combineMetadata } from './clientMetadata'
import { setDeadline } from './clientDeadline'
import { extractSignal } from './clientSignal'
import { iterator } from '../utils/iterator'
import { createContext, createResponse, ClientResponse } from './clientContext'
import { UntypedServiceImplementation, Metadata, StatusObject, ClientReadableStream } from '@grpc/grpc-js'
import type { ComposedMiddleware } from '../utils/compose'

export type ClientReadableStreamCall = ClientReadableStream<any> & {
  readAll: () => AsyncIterableIterator<any>
  readEnd: () => ClientResponse
}

export const serverStreamProxy = (
  client: UntypedServiceImplementation,
  func: any,
  composeFunc: ComposedMiddleware,
  defaultMetadata: Record<string, unknown>,
  defaultOptions: Record<string, unknown>,
  methodOptions: { requestStream: boolean; responseStream: boolean }
) => {
  return async (request?: any, metadata?: Metadata, options?: Record<string, unknown>): Promise<ClientReadableStreamCall> => {
    if (typeof options === 'function') {
      throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
    } else if (typeof metadata === 'function') {
      throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
    }

    metadata = combineMetadata(metadata || new Metadata(), defaultMetadata)
    options = setDeadline(options, defaultOptions)

    const { signal, options: callOptions } = extractSignal(options)
    signal?.throwIfAborted()

    const ctx = createContext({ request, metadata, options: callOptions, methodOptions })

    const ctxRequest = ctx.request
    const ctxMetadata = ctx.method.metadata
    const ctxOptions = ctx.method.options
    const call = func.apply(client, [ctxRequest, ctxMetadata, ctxOptions])

    const onAbort = () => call.cancel()
    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true })
    }

    const handler = async () => {
      call.readAll = () => {
        call.on('metadata', (metadata: Metadata) => {
          ctx.metadata = metadata
        })
        call.on('status', (status: StatusObject) => {
          ctx.status = status
          ctx.peer = call.getPeer()
          signal?.removeEventListener('abort', onAbort)
        })
        return iterator(call, 'data', {
          resolutionEvents: ['status', 'end']
        })
      }
    }
    try {
      await composeFunc(ctx, handler)
    } catch (err) {
      throw createClientError(err, metadata)
    }

    call.readEnd = () => {
      return createResponse(ctx)
    }

    return call
  }
}
