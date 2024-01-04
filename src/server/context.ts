import * as grpc from '@grpc/grpc-js'

export type ContextType = {
  path: string
  request: any
  metadata: grpc.Metadata
  response?: any
}

export const createContext = (call: Record<any, any>): ContextType => {
  return {
    // TODO: maybe need more details
    // method: target.constructor.name + '.' + key,
    path: call.getPath() || '',
    request: call.request,
    metadata: call.metadata.clone()
  }
}
