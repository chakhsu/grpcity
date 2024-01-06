import * as grpc from '@grpc/grpc-js'

export type ServerContextType = {
  path: string
  method: {
    requestStream: boolean
    responseStream: boolean
  }
  request: any
  metadata: grpc.Metadata
  response?: any
  [key: string]: any
}

export const createContext = (call: any, methodOptions: { requestStream: boolean; responseStream: boolean }): ServerContextType => {
  const { requestStream, responseStream } = methodOptions
  return {
    path: call.getPath() || '',
    method: {
      requestStream: requestStream || false,
      responseStream: responseStream || false
    },
    request: call.request,
    metadata: call.metadata.clone()
  }
}
