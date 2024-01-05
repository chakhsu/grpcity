import * as grpc from '@grpc/grpc-js'

export type ServerContextType = {
  path: string
  request: any
  metadata: grpc.Metadata
  response?: any
}

export const createContext = (call: Record<any, any>): ServerContextType => {
  return {
    // TODO: maybe need more details
    // method: target.constructor.name + '.' + key,
    path: call.getPath() || '',
    request: call.request,
    metadata: call.metadata.clone()
  }
}
