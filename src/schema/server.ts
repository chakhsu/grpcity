import Joi from 'joi'

import type { ChannelOptions } from '@grpc/grpc-js'
import { defaultChannelOptions } from '../config/defaultChannelOptions'

export const assignServerChannelOptions = (options?: ChannelOptions): ChannelOptions => {
  return Object.assign({}, defaultChannelOptions, options || {})
}
