import Joi from 'joi'
import type { Options as LoaderOptions } from '@grpc/proto-loader'
import type { ChannelOptions, ChannelCredentials } from '@grpc/grpc-js'
import { defaultLoadOptions } from '../config/defaultLoadOptions'
import { defaultChannelOptions } from '../config/defaultChannelOptions'

export type { Options as LoaderOptions } from '@grpc/proto-loader'
export type { ChannelOptions as ServerOptionsType } from '@grpc/grpc-js'

const protoFileOptionsSchema = Joi.array()
  .items(
    Joi.object({
      location: Joi.string().required(),
      files: Joi.array().items(Joi.string()).required()
    })
  )
  .single()

export type ProtoFileOptionType = {
  location: string
  files: string[]
}

export type ProtoFileOptionsType = ProtoFileOptionType[] | ProtoFileOptionType

export const assertProtoFileOptionsOptions = (options: ProtoFileOptionsType) => {
  Joi.assert(options, protoFileOptionsSchema, 'new ProtoLoader() params error')
}

export type AddressObject = {
  host: string
  port: number
}
export type Address = AddressObject | string

export type InitOptionsType = {
  isDev?: boolean
  packagePrefix?: string
  loadOptions?: LoaderOptions
}

export const AddressSchema = Joi.alternatives([
  Joi.string().regex(/:/, 'host and port like 127.0.0.1:9090'),
  Joi.object({
    host: Joi.string().required(),
    port: Joi.number().integer().min(0).max(65535).required()
  })
])

const ClientsAddressSchema = Joi.object().pattern(/\.*/, AddressSchema)

const InitOptionsSchema = Joi.object({
  isDev: Joi.boolean().optional(),
  packagePrefix: Joi.string().optional(),
  loadOptions: Joi.object().optional().default(defaultLoadOptions)
})

export const attemptInitOptions = (options?: InitOptionsType) => {
  return Joi.attempt(options || {}, InitOptionsSchema)
}

const ClientsOptionsSchema = Joi.object({
  services: ClientsAddressSchema.optional(),
  credentials: Joi.any().optional(),
  channelOptions: Joi.object().optional().default(defaultChannelOptions)
})

export type ClientsOptionsType = {
  services: Record<string, Address>
  channelOptions?: ChannelOptions
  credentials?: ChannelCredentials
}

export const attemptInitClientsOptions = (options: ClientsOptionsType) => {
  return Joi.attempt(options || {}, ClientsOptionsSchema)
}
