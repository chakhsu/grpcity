import * as grpc from '@grpc/grpc-js'
import iterator from '../utils/iterator'
import { createContext } from './serverContext'
import { createServerError } from './serverError'

export const callClientStreamProxy = (target: any, key: string, composeFunc: Function): grpc.handleClientStreamingCall<any, any> => {
  return (call: any, callback) => {
    const ctx = createContext(call)

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
