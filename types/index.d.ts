import * as grpc from '@grpc/grpc-js'
import ServerProxy from './proxy/serverProxy'
declare class GrpcLoader {
  private _protoFiles
  private _clientMap
  private _clientAddrMap
  private _types
  private _packagePrefix?
  private _appName?
  private _packageDefinition
  private _isDev?
  private _reflectedRoot
  private _insecureCredentials?
  private _initDefaultClient?
  constructor(protoFileOptions: any)
  init({ services, isDev, packagePrefix, loadOptions, channelOptions, appName }?: any): Promise<void>
  initClients({ services, channelOptions, credentials }: any): Promise<void>
  closeClients(): void
  makeCredentials(rootCerts?: any, privateKey?: any, certChain?: any, verifyOptions?: any): grpc.ChannelCredentials
  service(name: string): any
  type(name: string): any
  message(name: string): any
  client(name: string, { host, port, timeout, credentials, channelOptions }?: any): any
  realClient(name: string, { host, port, credentials, channelOptions }?: any): any
  clientWithoutCache(name: string, { addr, timeout, credentials, channelOptions }?: any): any
  private _makeClient
  private _makeClientWithoutCache
  makeMetadata(initialValues: any): grpc.Metadata
  initServer(...args: any[]): ServerProxy
}
export default GrpcLoader
