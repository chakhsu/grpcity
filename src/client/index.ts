import * as _ from 'lodash-es'
import { ProtoLoader } from '../loader'
import { ClientFactory } from './clientFactory'
import { clientProxy } from './clientProxy'

import type { ClientsOptionsType, AddressObject } from '../schema/loader'
import type { ClientOptionsType } from '../schema/client'

const prepareUrl = (url: ClientOptionsType['url']) => {
  return {
    isDefaultClient: !!url,
    addr: _.isString(url) ? (url as string) : (url as AddressObject)?.host + ':' + (url as AddressObject)?.port
  }
}

export default class Clients {
  private _proxyClientMap: Map<string, any> = new Map()
  private _clientFactory: ClientFactory
  private _credentials: ClientsOptionsType['credentials']

  constructor(loader: ProtoLoader, options: ClientsOptionsType) {
    this._clientFactory = new ClientFactory(loader)
    const { services, channelOptions, credentials } = options

    if (credentials) {
      this._credentials = credentials
    }

    const serviceNames = Object.keys(services)
    serviceNames.forEach((name) => {
      const isDefault = true

      const addr = _.isString(services[name])
        ? (services[name] as string)
        : (services[name] as AddressObject).host + ':' + (services[name] as AddressObject).port

      this._clientFactory.create(isDefault, name, addr, credentials, channelOptions)
    })
    return this
  }

  get(name: string, clientOptions: ClientOptionsType = {}) {
    let { url, channelOptions, credentials, timeout } = clientOptions
    const { isDefaultClient, addr } = prepareUrl(url)

    if (!credentials) {
      credentials = this._credentials
    }

    const cacheKeyPrefix = isDefaultClient ? 'default' : addr.replace(/\./g, '-')
    const cacheKey = `proxy.${cacheKeyPrefix}.${name}.${timeout}`

    if (this._proxyClientMap.has(cacheKey)) {
      return this._proxyClientMap.get(cacheKey)
    }

    const client = this._clientFactory.create(isDefaultClient, name, addr, credentials, channelOptions)
    const proxy = clientProxy(client, { timeout })
    this._proxyClientMap.set(cacheKey, proxy)
    return proxy
  }

  getReal(name: string, clientOptions: ClientOptionsType = {}) {
    let { url, channelOptions, credentials } = clientOptions as ClientOptionsType

    if (!credentials) {
      credentials = this._credentials
    }

    const { isDefaultClient, addr } = prepareUrl(url)

    const client = this._clientFactory.create(isDefaultClient, name, addr, credentials, channelOptions)
    return client
  }

  clear() {
    this._clientFactory.clear()
    this._proxyClientMap.clear()
  }
}
