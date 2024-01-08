import type { UntypedServiceImplementation } from '@grpc/grpc-js'

export const callbackProxy = (client: UntypedServiceImplementation, func: any) => {
  return (...argumentsList: any[]) => {
    return func.apply(client, argumentsList)
  }
}
