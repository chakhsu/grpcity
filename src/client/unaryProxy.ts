import { createClientError } from './clientError'
import { combineMetadata } from './clientMetadata'
import { setDeadline } from './clientDeadline'
import { createContext, createResponse, ClientResponse } from './clientContext'
import { UntypedServiceImplementation, Metadata, StatusObject, ClientUnaryCall } from '@grpc/grpc-js'
import type { ComposedMiddleware } from '../utils/compose'

export type { ClientUnaryCall } from '@grpc/grpc-js'

export const unaryProxy = (
  client: UntypedServiceImplementation,
  func: any,
  composeFunc: ComposedMiddleware,
  defaultMetadata: Record<string, unknown>,
  defaultOptions: Record<string, unknown>,
  methodOptions: { requestStream: boolean; responseStream: boolean }
) => {
  return async (request?: any, metadata?: Metadata, options?: Record<string, unknown>): Promise<ClientResponse> => {
    if (typeof options === 'function') {
      throw new Error('gRPCity: AsyncFunction should not contain a callback function')
    } else if (typeof metadata === 'function') {
      throw new Error('gRPCity: AsyncFunction should not contain a callback function')
    }

    metadata = combineMetadata(metadata || new Metadata(), defaultMetadata)
    options = setDeadline(options, defaultOptions)

    const ctx = createContext({ request, metadata, options, methodOptions })

    const handler = async () => {
      await new Promise<void>((resolve, reject) => {
        const { request } = ctx
        const { metadata, options } = ctx.method

        const argumentsList: Array<any> = [request, metadata, options]
        argumentsList.push((err: any, response: any) => {
          if (err) {
            reject(createClientError(err, metadata))
            return
          }
          ctx.response = response
        })

        const call: ClientUnaryCall = func.apply(client, argumentsList)

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

    await composeFunc(ctx, handler)

    return createResponse(ctx)
  }
}
