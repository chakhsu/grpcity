import { createClientError } from './clientError'
import { combineMetadata } from './clientMetadata'
import { UntypedServiceImplementation, Metadata, StatusObject } from '@grpc/grpc-js'

export const unaryProxy = (
  client: UntypedServiceImplementation,
  func: any,
  defaultMetadata: Record<string, unknown>,
  defaultOptions: Record<string, unknown>
) => {
  return async (request: any, metadata?: Metadata, options?: Record<string, unknown>): Promise<any> => {
    if (typeof options === 'function') {
      throw new Error('gRPCity: AsyncFunction should not contain a callback function')
    } else if (typeof metadata === 'function') {
      throw new Error('gRPCity: AsyncFunction should not contain a callback function')
    }

    metadata = combineMetadata(metadata || new Metadata(), defaultMetadata)
    options = Object.assign({}, defaultOptions, options)

    return new Promise((resolve, reject) => {
      const result: { response?: any; metadata?: Metadata; status?: StatusObject } = {}
      const argumentsList: Array<any> = [request, metadata, options]
      argumentsList.push((err: any, response: any) => {
        if (err) {
          reject(createClientError(err, metadata))
        }
        result.response = response
      })

      const call = func.apply(client, argumentsList)

      call.on('metadata', (metadata: Metadata) => {
        result.metadata = metadata
      })
      call.on('status', (status: StatusObject) => {
        result.status = status
        resolve(result)
      })
    })
  }
}
