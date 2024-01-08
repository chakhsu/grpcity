import * as grpc from '@grpc/grpc-js'

export type ClientContext = {
  path: string
  method: {
    requestStream: boolean
    responseStream: boolean
    metadata: grpc.Metadata
    options: Record<string, any>
  }
  request?: any
  status?: grpc.StatusObject
  peer?: string
  metadata?: grpc.Metadata
  response?: any
  [key: string]: any
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

export const createContext = (args: createContextOptions): ClientContext => {
  const { request, metadata, options, methodOptions } = args
  const { requestStream, responseStream } = methodOptions
  return {
    path: metadata?.get('x-service-path')[0].toString() || '',
    method: {
      requestStream: requestStream || false,
      responseStream: responseStream || false,
      metadata: metadata?.clone() || new grpc.Metadata(),
      options
    },
    request: request || {}
  }
}

export type ClientResponse = {
  status?: grpc.StatusObject
  peer?: string
  metadata?: grpc.Metadata
  response?: any
}

export const createResponse = (ctx: ClientContext): ClientResponse => {
  return {
    status: ctx.status,
    peer: ctx.peer,
    metadata: ctx.metadata,
    response: ctx.response
  }
}
