import * as grpc from '@grpc/grpc-js'
import iterator from '../utils/iterator'
import { createContext } from './serverContext'
import { createServerError } from './serverError'

export type ServerReadableStream = grpc.ServerReadableStream<any, any> & {
  readAll: Function
}

export type HandleClientStreamingCall = (call: ServerReadableStream, callback: grpc.sendUnaryData<Response>) => void

export const callClientStreamProxy = (
  target: any,
  key: string,
  composeFunc: Function,
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
      await composeFunc(ctx, handleResponse).catch((err: Error) => {
        callback(createServerError(err))
      })
      callback(null, ctx.response)
    })
  }
}
