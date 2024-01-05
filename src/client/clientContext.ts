import * as grpc from '@grpc/grpc-js'

export type ClientContextType = {
  path: string
  req: {
    request?: any
    metadata?: grpc.Metadata
    options?: Record<string, any>
  }
  res: {
    response?: any
    metadata?: grpc.Metadata
    status?: grpc.StatusObject
  }
}

export const createContext = (args: { request?: any; metadata?: grpc.Metadata; options?: Record<string, any> }): ClientContextType => {
  return {
    path: args.metadata?.get('x-service-path')[0].toString() || '',
    req: args,
    res: {}
  }
}
