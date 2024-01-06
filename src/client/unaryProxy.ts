import { createClientError } from './clientError'
import { combineMetadata } from './clientMetadata'
import { setDeadline } from './clientDeadline'
import { createContext, createResponse } from './clientContext'
import { UntypedServiceImplementation, Metadata, StatusObject } from '@grpc/grpc-js'

export const unaryProxy = (
  client: UntypedServiceImplementation,
  func: any,
  composeFunc: Function,
  defaultMetadata: Record<string, unknown>,
  defaultOptions: Record<string, unknown>,
  methodOptions: { requestStream: boolean; responseStream: boolean }
) => {
  return async (request?: any, metadata?: Metadata, options?: Record<string, unknown>): Promise<any> => {
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
        let { request } = ctx
        let { metadata, options } = ctx.method

        const argumentsList: Array<any> = [request, metadata, options]
        argumentsList.push((err: any, response: any) => {
          if (err) {
            reject(createClientError(err, metadata))
          }
          ctx.response = response
        })

        const call = func.apply(client, argumentsList)

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

    await composeFunc(ctx, handler).catch((err: Error) => {
      throw createClientError(err, metadata)
    })

    return createResponse(ctx)
  }
}
