import * as grpc from '@grpc/grpc-js'
import { createContext } from './serverContext'
import { createServerError } from './serverError'
import type { ComposedMiddleware } from '../utils/compose'

export type ServerUnaryCall = grpc.ServerUnaryCall<any, any>

export type HandleUnaryCall = (call: ServerUnaryCall, callback: grpc.sendUnaryData<Response>) => void

export const callUnaryProxy = (
  target: any,
  key: string,
  composeFunc: ComposedMiddleware,
  methodOptions: { requestStream: boolean; responseStream: boolean }
): HandleUnaryCall => {
  return (call, callback) => {
    const ctx = createContext(call, methodOptions)

    Promise.resolve().then(async () => {
      const handleResponse = async () => {
        if (call.request) {
          call.request = ctx.request
        }
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
