import * as grpc from '@grpc/grpc-js'
import { createContext } from './context'
import { createServerError } from './serverError'

export const callServerStreamProxy = (target: any, key: string, composeFunc: Function): grpc.handleServerStreamingCall<any, any> => {
  return (call: any) => {
    const ctx = createContext(call)

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
        await target[key](call)
      }
      await composeFunc(ctx, handleResponse).catch((err: Error) => {
        call.destroy(createServerError(err))
      })
      call.end()
    })
  }
}
