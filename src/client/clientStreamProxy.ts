import { createClientError } from './clientError'
import { combineMetadata } from './clientMetadata'
import type { UntypedServiceImplementation, Metadata, StatusObject } from '@grpc/grpc-js'

export const clientStreamProxy = (
  client: UntypedServiceImplementation,
  func: any,
  defaultMetadata: Record<string, unknown>,
  defaultOptions: Record<string, unknown>
) => {
  return (metadata: Metadata, options: Record<string, unknown>): any => {
    if (typeof options === 'function') {
      throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
    } else if (typeof metadata === 'function') {
      throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
    }

    metadata = combineMetadata(metadata, defaultMetadata)
    options = Object.assign({}, defaultOptions, options)

    const result: { response?: any; metadata?: Metadata; status?: StatusObject } = {}

    const argumentsList: Array<any> = [metadata, options]
    argumentsList.push((err: any, response: any) => {
      if (err) {
        throw createClientError(err, metadata)
      }
      result.response = response
    })

    const call = func.apply(client, argumentsList)

    call.writeAll = (messages: any[]) => {
      if (Array.isArray(messages)) {
        messages.forEach((message) => {
          call.write(message)
        })
      }
    }
    call.writeEnd = async () => {
      call.end()
      await new Promise<void>((resolve, reject) => {
        call.on('metadata', (metadata: Metadata) => {
          result.metadata = metadata
        })
        call.on('status', (status: StatusObject) => {
          result.status = status
          resolve()
        })
      })
      return result
    }

    return call
  }
}
