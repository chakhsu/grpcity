import { createClientError } from './clientError'
import { combineMetadata } from './clientMetadata'
import iterator from '../utils/iterator'
import type { UntypedServiceImplementation, Metadata, StatusObject } from '@grpc/grpc-js'

export const bidiStreamProxy = (
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

    const call = func.apply(client, [metadata, options])

    call.writeAll = (messages: any[]) => {
      if (Array.isArray(messages)) {
        messages.forEach((message) => {
          call.write(message)
        })
      }
    }
    call.writeEnd = call.end

    call.on('error', (err: Error) => {
      throw createClientError(err, metadata)
    })

    const result: { metadata?: Metadata; status?: StatusObject } = {}
    call.readAll = () => {
      call.on('metadata', (metadata: Metadata) => {
        result.metadata = metadata
      })
      call.on('status', (status: StatusObject) => {
        result.status = status
      })
      return iterator(call, 'data', {
        resolutionEvents: ['status', 'end']
      })
    }
    call.readEnd = () => {
      return result
    }

    return call
  }
}
