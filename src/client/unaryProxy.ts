import { createClientError } from './clientError'
import { combineMetadata } from './clientMetadata'
import { setDeadline } from './clientDeadline'
import { createContext } from './clientContext'
import { UntypedServiceImplementation, Metadata, StatusObject } from '@grpc/grpc-js'

export const unaryProxy = (
  client: UntypedServiceImplementation,
  func: any,
  defaultMetadata: Record<string, unknown>,
  defaultOptions: Record<string, unknown>,
  composeFunc: Function
) => {
  return async (request?: any, metadata?: Metadata, options?: Record<string, unknown>): Promise<any> => {
    if (typeof options === 'function') {
      throw new Error('gRPCity: AsyncFunction should not contain a callback function')
    } else if (typeof metadata === 'function') {
      throw new Error('gRPCity: AsyncFunction should not contain a callback function')
    }

    metadata = combineMetadata(metadata || new Metadata(), defaultMetadata)
    options = setDeadline(options, defaultOptions)

    const ctx = createContext({ request, metadata, options })

    const handler = async () => {
      await new Promise<void>((resolve, reject) => {
        let { request, metadata, options } = ctx.req

        const argumentsList: Array<any> = [request, metadata, options]
        argumentsList.push((err: any, response: any) => {
          if (err) {
            reject(createClientError(err, metadata))
          }
          ctx.res.response = response
        })

        const call = func.apply(client, argumentsList)

        call.on('metadata', (metadata: Metadata) => {
          ctx.res.metadata = metadata
        })
        call.on('status', (status: StatusObject) => {
          ctx.res.status = status
          resolve()
        })
      })
    }

    await composeFunc(ctx, handler).catch((err: Error) => {
      throw createClientError(err, metadata)
    })

    return ctx.res
  }
}
