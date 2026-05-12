import * as grpc from '@grpc/grpc-js'
import { iterator } from '../utils/iterator'
import { createContext } from './serverContext'
import { createServerError } from './serverError'
import type { ComposedMiddleware } from '../utils/compose'

export type ServerDuplexStream = grpc.ServerDuplexStream<any, any> & {
  writeAll: (message: any[]) => void
  readAll: () => AsyncIterableIterator<any>
}

export type HandleBidiStreamingCall = (call: ServerDuplexStream) => void

export const callBidiStreamProxy = (
  target: any,
  key: string,
  composeFunc: ComposedMiddleware,
  methodOptions: { requestStream: boolean; responseStream: boolean }
): HandleBidiStreamingCall => {
  return (call) => {
    const ctx = createContext(call, methodOptions)

    call.writeAll = (messages: any[]) => {
      if (Array.isArray(messages)) {
        messages.forEach((message) => {
          call.write(message)
        })
      }
    }
    call.readAll = () => {
      return iterator(call, 'data', {
        resolutionEvents: ['end']
      })
    }

    Promise.resolve().then(async () => {
      const handleResponse = async () => {
        await target[key](call)
      }
      try {
        await composeFunc(ctx, handleResponse)
      } catch (err) {
        call.destroy(createServerError(err as Error))
        return
      }
      call.end()
    })
  }
}
