import * as grpc from '@grpc/grpc-js'
import { createContext } from './serverContext'
import { createServerError } from './serverError'
import type { ComposedMiddleware } from '../utils/compose'

export type ServerWritableStream = grpc.ServerWritableStream<any, any> & {
  writeAll: (message: any[]) => void
  writeEnd: (metadata?: grpc.Metadata) => void
}

export type HandleServerStreamingCall = (call: ServerWritableStream) => void

export const callServerStreamProxy = (
  target: any,
  key: string,
  composeFunc: ComposedMiddleware,
  methodOptions: { requestStream: boolean; responseStream: boolean }
): HandleServerStreamingCall => {
  return (call) => {
    const ctx = createContext(call, methodOptions)

    call.writeAll = (messages: any[]) => {
      if (Array.isArray(messages)) {
        messages.forEach((message) => {
          call.write(message)
        })
      }
    }
    call.writeEnd = call.end

    Promise.resolve().then(async () => {
      const handleResponse = async () => {
        if (call.request) {
          call.request = ctx.request
        }
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
