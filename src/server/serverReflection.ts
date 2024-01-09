import { ReflectionService } from '@grpc/reflection'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

export type ReflectionServerOptions = {
  /** whitelist of fully-qualified service names to expose. (Default: expose all) */
  services?: string[]
}

export class Reflection {
  private _reflectionService?: ReflectionService

  constructor(pkg: protoLoader.PackageDefinition, options?: ReflectionServerOptions) {
    this._reflectionService = new ReflectionService(pkg, options)
  }

  inject(server: Pick<grpc.Server, 'addService'>) {
    if (this._reflectionService) {
      this._reflectionService.addToServer(server)
    }
  }
}
