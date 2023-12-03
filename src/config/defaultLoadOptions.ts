// GRPC protos loader options
// Doc: https://www.npmjs.com/package/@grpc/proto-loader
import { Options } from '@grpc/proto-loader'

export const defaultLoadOptions: Options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: false,
  oneofs: true
}
