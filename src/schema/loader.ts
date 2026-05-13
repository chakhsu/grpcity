import { z, ZodError } from 'zod'
import type { Options as LoaderOptions } from '@grpc/proto-loader'
import type { ChannelOptions, ChannelCredentials, ServerCredentials } from '@grpc/grpc-js'
import { defaultLoadOptions } from '../config/defaultLoadOptions'
import { defaultChannelOptions } from '../config/defaultChannelOptions'

export type { Options as LoaderOptions } from '@grpc/proto-loader'

const formatZodError = (err: ZodError): string => err.issues.map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`).join('; ')

const protoFileOptionsSchema = z.union([
  z.object({
    location: z.string(),
    files: z.array(z.string())
  }),
  z.array(
    z.object({
      location: z.string(),
      files: z.array(z.string())
    })
  )
])

export type ProtoFileOptionType = {
  location: string
  files: string[]
}

export type ProtoFileOptions = ProtoFileOptionType[] | ProtoFileOptionType

export const assertProtoFileOptionsOptions = (options: ProtoFileOptions) => {
  try {
    protoFileOptionsSchema.parse(options)
  } catch (err) {
    if (err instanceof ZodError) {
      throw new Error(`new ProtoLoader() params error: ${formatZodError(err)}`)
    }
    throw err
  }
}

export type AddressObject = {
  host: string
  port: number
}
export type Address = AddressObject | string

export type InitOptions = {
  isDev?: boolean
  packagePrefix?: string
  loadOptions?: LoaderOptions
}

export const AddressSchema = z.union([
  z.string().regex(/:/, 'host and port like 127.0.0.1:9090'),
  z.object({
    host: z.string(),
    port: z.number().int().min(0).max(65535)
  })
])

const ClientsAddressSchema = z.record(z.string(), AddressSchema)

const looseObjectSchema = z.record(z.string(), z.unknown())

const InitOptionsSchema = z.object({
  isDev: z.boolean().optional(),
  packagePrefix: z.string().optional(),
  loadOptions: looseObjectSchema.optional().default(defaultLoadOptions as Record<string, unknown>)
})

export const attemptInitOptions = (options?: InitOptions) => {
  return InitOptionsSchema.parse(options || {}) as Required<Pick<InitOptions, 'loadOptions'>> & InitOptions
}

const ClientsOptionsSchema = z.object({
  services: ClientsAddressSchema.optional(),
  credentials: z.any().optional(),
  channelOptions: looseObjectSchema.optional().default(defaultChannelOptions as Record<string, unknown>)
})

export type ClientsOptions = {
  services: Record<string, Address>
  channelOptions?: ChannelOptions
  credentials?: ChannelCredentials
}

export const attemptInitClientsOptions = (options: ClientsOptions): ClientsOptions => {
  return ClientsOptionsSchema.parse(options || {}) as ClientsOptions
}

const ServerOptionsSchema = z.object({
  channelOptions: looseObjectSchema.optional().default(defaultChannelOptions as Record<string, unknown>),
  credentials: z.any().optional()
})

export type ServerOptions = {
  channelOptions?: ChannelOptions
  credentials?: ServerCredentials
}

export const attemptInitServerOptions = (options?: ServerOptions): ServerOptions => {
  return ServerOptionsSchema.parse(options || {}) as ServerOptions
}
