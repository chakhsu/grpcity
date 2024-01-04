import * as grpc from '@grpc/grpc-js'
import { createContext } from './context'
import { createServerError } from './serverError'

export const callUnaryProxy = (target: any, key: string, composeFunc: Function): grpc.handleUnaryCall<any, any> => {
  return (call, callback) => {
    const ctx = createContext(call)

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
