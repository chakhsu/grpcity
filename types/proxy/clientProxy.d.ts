import { UntypedServiceImplementation } from '@grpc/grpc-js'
declare class ClientProxy {
  private _getFuncStreamWay
  private _prepareMetadata
  private _handlerError
  private _setDeadline
  private _promisifyUnaryMethod
  private _promisifyClientStreamMethod
  private _promisifyServerStreamMethod
  private _promisifyDuplexStreamMethod
  private _keepCallbackMethod
  _proxy(client: UntypedServiceImplementation, defaultOptions?: Record<string, any>, appName?: string): any
}
declare const _default: ClientProxy
export default _default
