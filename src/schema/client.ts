import Joi from 'joi'
import type { ChannelOptions, ChannelCredentials } from '@grpc/grpc-js'
import { defaultChannelOptions } from '../config/defaultChannelOptions'
import { AddressSchema, Address } from './loader'

export type { ChannelOptions } from '@grpc/grpc-js'

export const assignChannelOptions = (options?: ChannelOptions): ChannelOptions => {
  return Object.assign({}, defaultChannelOptions, options || {})
}

const ClientOptionsSchema = Joi.object({
  url: AddressSchema.optional(),
  credentials: Joi.any().optional(),
  channelOptions: Joi.object().optional().default(defaultChannelOptions),
  timeout: Joi.number()
    .min(0)
    .optional()
    .default(1000 * 10)
}).optional()

export type ClientOptionsType = {
  url: Address
  channelOptions?: ChannelOptions
  credentials?: ChannelCredentials
  timeout?: number
  [key: string]: any
}

export const attemptClientOptions = (options: ClientOptionsType) => {
  return Joi.attempt(options || {}, ClientOptionsSchema)
}
