import * as grpc from '@grpc/grpc-js'
import { createContext } from './serverContext'
import { createServerError } from './serverError'

export type ServerUnaryCall = grpc.ServerUnaryCall<any, any>

export type HandleUnaryCall = (call: ServerUnaryCall, callback: grpc.sendUnaryData<Response>) => void

export const callUnaryProxy = (
  target: any,
  key: string,
  composeFunc: Function,
  methodOptions: { requestStream: boolean; responseStream: boolean }
): HandleUnaryCall => {
  return (call, callback) => {
    const ctx = createContext(call, methodOptions)

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
