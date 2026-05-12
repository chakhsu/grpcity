import type { ChannelCredentials, ChannelOptions, ServiceClientConstructor } from '@grpc/grpc-js'
import { ProtoLoader } from '../loader'
import { assignChannelOptions } from '../schema/client'

export class ClientFactory {
  private _loader: ProtoLoader
  private _clientMap: Map<string, any> = new Map()
  private _clientAddrMap: Map<string, string> = new Map()

  constructor(loader: ProtoLoader) {
    this._loader = loader
  }

  create(isDefault: boolean, name: string, addr: string | undefined, credentials?: ChannelCredentials, options?: ChannelOptions) {
    const cacheAddr = addr || this._clientAddrMap.get(name) || ''
    if (cacheAddr === '') {
      throw new Error(`client factory create() [${name}]: address not found.`)
    }

    const cacheKeyPrefix = isDefault ? 'default' : cacheAddr.replace(/\./g, '-')
    const cacheKey = `${cacheKeyPrefix}.${name}`
    if (this._clientMap.has(cacheKey)) {
      return this._clientMap.get(cacheKey)
    }

    if (!credentials) {
      credentials = this._loader.makeClientCredentials()
    }
    const channelOptions = assignChannelOptions(options)

    const client = this.createReal(name, cacheAddr, credentials, channelOptions)
    this._clientAddrMap.set(name, cacheAddr)
    this._clientMap.set(cacheKey, client)
    return client
  }

  createReal(name: string, addr: string, credentials?: ChannelCredentials, options?: Partial<ChannelOptions>) {
    if (!credentials) {
      credentials = this._loader.makeClientCredentials()
    }
    const newOptions = assignChannelOptions(options)

    const ServiceProto = this._loader.type(name)
    const client = new (ServiceProto as ServiceClientConstructor)(addr, credentials, newOptions)
    return client
  }

  clear() {
    this._clientMap.forEach((client) => {
      if (client && typeof client.close === 'function') {
        client.close()
      }
    })
    this._clientMap.clear()
    this._clientAddrMap.clear()
  }
}
