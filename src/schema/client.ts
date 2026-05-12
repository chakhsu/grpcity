import type { ChannelOptions, ChannelCredentials } from '@grpc/grpc-js'
import { defaultChannelOptions } from '../config/defaultChannelOptions'
import type { Address } from './loader'

export type { ChannelOptions } from '@grpc/grpc-js'

export const assignChannelOptions = (options?: ChannelOptions): ChannelOptions => {
  return Object.assign({}, defaultChannelOptions, options || {})
}

export type ClientOptions = {
  url?: Address
  channelOptions?: ChannelOptions
  credentials?: ChannelCredentials
  timeout?: number
  [key: string]: any
}
