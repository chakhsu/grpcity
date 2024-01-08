import Joi from 'joi'

import type { ChannelOptions } from '@grpc/grpc-js'
import { defaultChannelOptions } from '../config/defaultChannelOptions'
import { ServerOptions } from './loader'

export const assignServerOptions = (options?: ServerOptions): ChannelOptions => {
  return Object.assign({}, defaultChannelOptions, options || {})
}
