// export loader
export * from './loader'
export { defaultChannelOptions } from './config/defaultChannelOptions'
export { defaultLoadOptions } from './config/defaultLoadOptions'
export type { ProtoFileOptions, InitOptions, Address } from './schema/loader'
export type { ClientsOptions, ServerOptions, LoaderOptions } from './schema/loader'

// export status
export { Status } from './schema/status'

// export client
export type { ClientOptions } from './schema/client'
export type { ClientCallOptions } from './client/clientSignal'
export type { ClientUnaryCall } from './client/unaryProxy'
export type { ClientWritableStreamCall } from './client/clientStreamProxy'
export type { ClientReadableStreamCall } from './client/serverStreamProxy'
export type { ClientDuplexStreamCall } from './client/bidiStreamProxy'

// export server
export type { HandleUnaryCall, ServerUnaryCall } from './server/unaryCallProxy'
export type { HandleClientStreamingCall, ServerReadableStream } from './server/clientStreamingCallProxy'
export type { HandleServerStreamingCall, ServerWritableStream } from './server/serverStreamingCallProxy'
export type { HandleBidiStreamingCall, ServerDuplexStream } from './server/bidiStreamingCallProxy'
export type { ReflectionServerOptions } from './server/serverReflection'

// export middleware
export type { ClientContext } from './client/clientContext'
export type { ServerContext } from './server/serverContext'
export type { Next, MiddlewareFunction } from './utils/compose'

// re-export grpc-js values and types so users don't need to depend on
// @grpc/grpc-js directly for common construction needs (Metadata,
// credentials helpers, status shapes).
export { Metadata, credentials } from '@grpc/grpc-js'
export type { StatusObject, ChannelCredentials, ServerCredentials, MetadataValue, ChannelOptions } from '@grpc/grpc-js'
