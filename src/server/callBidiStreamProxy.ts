import * as grpc from '@grpc/grpc-js'
import iterator from '../utils/iterator'
import { createContext } from './context'
import { createServerError } from './serverError'

export const callBidiStreamProxy = (target: any, key: string, composeFunc: Function): grpc.handleBidiStreamingCall<any, any> => {
  return (call: any) => {
    const ctx = createContext(call)

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
      await composeFunc(ctx, handleResponse).catch((err: Error) => {
        call.destroy(createServerError(err))
      })
      call.end()
    })
  }
}