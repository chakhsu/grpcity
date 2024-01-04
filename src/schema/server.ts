import Joi from 'joi'

import type { ChannelOptions } from '@grpc/grpc-js'
import { defaultChannelOptions } from '../config/defaultChannelOptions'
import { ServerOptionsType } from './loader'

export const assignServerOptions = (options?: ServerOptionsType): ChannelOptions => {
  return Object.assign({}, defaultChannelOptions, options || {})
}
