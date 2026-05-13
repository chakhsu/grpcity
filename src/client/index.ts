import assert from 'node:assert'
import { ProtoLoader } from '../loader'
import { ClientFactory } from './clientFactory'
import { clientProxy } from './clientProxy'

import { isString } from '../utils/string'
import { compose } from '../utils/compose'
import type { MiddlewareFunction } from '../utils/compose'
import type { ClientsOptions, AddressObject } from '../schema/loader'
import type { ClientOptions } from '../schema/client'

const prepareUrl = (url: ClientOptions['url']) => {
  if (!url) {
    return { isDefaultClient: true, addr: undefined }
  }
  const addr = isString(url) ? (url as string) : `${(url as AddressObject).host}:${(url as AddressObject).port}`
  return { isDefaultClient: false, addr }
}

export default class Clients {
  private _middleware: MiddlewareFunction[] = []
  private _proxyClientMap: Map<string, any> = new Map()
  private _clientFactory: ClientFactory
  private _credentials: ClientsOptions['credentials']

  constructor(loader: ProtoLoader, options: ClientsOptions) {
    this._clientFactory = new ClientFactory(loader)
    this.init(options)
  }

  init(options: ClientsOptions) {
    const { services, channelOptions, credentials } = options

    if (credentials) {
      this._credentials = credentials
    }

    if (!services) {
      return
    }

    Object.keys(services).forEach((name) => {
      const service = services[name]
      const addr = isString(service) ? (service as string) : `${(service as AddressObject).host}:${(service as AddressObject).port}`
      this._clientFactory.create(true, name, addr, credentials, channelOptions)
    })
  }

  get(name: string, clientOptions: ClientOptions = {}) {
    const { url, channelOptions, timeout } = clientOptions
    let { credentials } = clientOptions
    const { isDefaultClient, addr } = prepareUrl(url)

    if (!credentials) {
      credentials = this._credentials
    }

    const cacheKeyPrefix = isDefaultClient || !addr ? 'default' : addr.replace(/\./g, '-')
    const cacheKey = `proxy.${cacheKeyPrefix}.${name}.${timeout}`

    if (this._proxyClientMap.has(cacheKey)) {
      return this._proxyClientMap.get(cacheKey)
    }

    const composeFunc = compose(this._middleware)

    const client = this._clientFactory.create(isDefaultClient, name, addr, credentials, channelOptions)
    const proxy = clientProxy(client, { timeout }, composeFunc)
    this._proxyClientMap.set(cacheKey, proxy)
    return proxy
  }

  getReal(name: string, clientOptions: ClientOptions = {}) {
    const { url, channelOptions } = clientOptions as ClientOptions
    let { credentials } = clientOptions as ClientOptions

    if (!credentials) {
      credentials = this._credentials
    }

    const { isDefaultClient, addr } = prepareUrl(url)

    const client = this._clientFactory.create(isDefaultClient, name, addr, credentials, channelOptions)
    return client
  }

  use(...args: MiddlewareFunction[]): void {
    assert(args.length >= 1, 'client use() takes at least one middleware.')
    if (args.length === 1) {
      if (Array.isArray(args[0])) {
        args[0].forEach((fn) => {
          this._middleware.push(fn)
        })
      } else {
        this._middleware.push(args[0])
      }
    } else {
      args.forEach((fn) => {
        this._middleware.push(fn)
      })
    }
  }

  clear() {
    this._clientFactory.clear()
    this._proxyClientMap.clear()
  }
}
