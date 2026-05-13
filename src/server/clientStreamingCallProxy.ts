import * as grpc from '@grpc/grpc-js'
import { iterator } from '../utils/iterator'
import { createContext } from './serverContext'
import { createServerError } from './serverError'
import type { ComposedMiddleware } from '../utils/compose'

export type ServerReadableStream = grpc.ServerReadableStream<any, any> & {
  readAll: () => AsyncIterableIterator<any>
}

export type HandleClientStreamingCall = (call: ServerReadableStream, callback: grpc.sendUnaryData<Response>) => void

export const callClientStreamProxy = (
  target: any,
  key: string,
  composeFunc: ComposedMiddleware,
  methodOptions: { requestStream: boolean; responseStream: boolean }
): HandleClientStreamingCall => {
  return (call, callback) => {
    const ctx = createContext(call, methodOptions)

    call.readAll = () => {
      return iterator(call, 'data', {
        resolutionEvents: ['end']
      })
    }

    Promise.resolve().then(async () => {
      const handleResponse = async () => {
        ctx.response = await target[key](call)
      }
      try {
        await composeFunc(ctx, handleResponse)
      } catch (err) {
        callback(createServerError(err as Error))
        return
      }
      callback(null, ctx.response)
    })
  }
}
