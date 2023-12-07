/// <reference types="node" />
import * as grpc from '@grpc/grpc-js'
import { MiddlewareFunction } from '../util/compose'
declare class ServerProxy {
  private _middleware
  private _loader?
  private _server?
  private _insecureServerCredentials?
  constructor()
  _init(loader: any, ...args: any[]): this
  listen(addr: any, credentials?: grpc.ServerCredentials | undefined): Promise<void>
  shutdown(): Promise<void>
  forceShutdown(): void
  makeServerCredentials(rootCerts?: Buffer, keyCertPairs?: grpc.KeyCertPair[], checkClientCertificate?: boolean): grpc.ServerCredentials
  addService(
    name: string,
    implementation: any,
    {
      exclude,
      inherit
    }?: {
      exclude?: string[]
      inherit?: any
    }
  ): void
  removeService(name: string): void
  addMiddleware(...args: MiddlewareFunction[]): void
  private _use
  private _callbackify
  private _proxy
  private _createContext
  private _callUnaryProxyMethod
  private _callClientStreamProxyMethod
  private _callServerStreamProxyMethod
  private _callDuplexStreamProxyMethod
  private _createInternalErrorStatus
}
export default ServerProxy
