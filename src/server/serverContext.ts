import * as grpc from '@grpc/grpc-js'

export type ServerContext = {
  path: string
  method: {
    requestStream: boolean
    responseStream: boolean
  }
  request: any
  metadata: grpc.Metadata
  peer: string
  response?: any
  [key: string]: any
}

export const createContext = (call: any, methodOptions: { requestStream: boolean; responseStream: boolean }): ServerContext => {
  const { requestStream, responseStream } = methodOptions
  return {
    path: call.getPath() || '',
    method: {
      requestStream: requestStream || false,
      responseStream: responseStream || false
    },
    request: call.request,
    metadata: call.metadata.clone(),
    peer: call.getPeer() || ''
  }
}
