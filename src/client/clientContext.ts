import * as grpc from '@grpc/grpc-js'

export type ClientContextType = {
  path: string
  method: {
    requestStream: boolean
    responseStream: boolean
    metadata: grpc.Metadata
    options: Record<string, any>
  }
  request?: any
  metadata?: grpc.Metadata
  response?: any
  status?: grpc.StatusObject
}

type createContextOptions = {
  request?: any
  metadata: grpc.Metadata
  options: Record<string, any>
  methodOptions: {
    requestStream: boolean
    responseStream: boolean
  }
}

export const createContext = (args: createContextOptions): ClientContextType => {
  const { request, metadata, options, methodOptions } = args
  const { requestStream, responseStream } = methodOptions
  return {
    path: metadata?.get('x-service-path')[0].toString() || '',
    method: {
      requestStream: requestStream || false,
      responseStream: responseStream || false,
      metadata: metadata.clone(),
      options
    },
    request: request || {}
  }
}

export const createResponse = (ctx: ClientContextType) => {
  return {
    status: ctx.status,
    metadata: ctx.metadata,
    response: ctx.response
  }
}
