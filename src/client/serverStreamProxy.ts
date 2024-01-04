import { createClientError } from './clientError'
import { combineMetadata } from './clientMetadata'
import { setDeadline } from './clientDeadline'
import iterator from '../utils/iterator'
import { UntypedServiceImplementation, Metadata, StatusObject } from '@grpc/grpc-js'

export const serverStreamProxy = (
  client: UntypedServiceImplementation,
  func: any,
  defaultMetadata: Record<string, unknown>,
  defaultOptions: Record<string, unknown>
) => {
  return (request: any, metadata?: Metadata, options?: Record<string, unknown>): any => {
    if (typeof options === 'function') {
      throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
    } else if (typeof metadata === 'function') {
      throw new Error('gRPCity: asyncStreamFunction should not contain a callback function')
    }

    metadata = combineMetadata(metadata || new Metadata(), defaultMetadata)
    options = setDeadline(options, defaultOptions)

    const call = func.apply(client, [request, metadata, options])

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
