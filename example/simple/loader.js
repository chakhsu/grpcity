import path from 'node:path'
import { ProtoLoader } from '../../lib/index.js'
// same as import { ProtoLoader } from 'grpcity'

export const loader = new ProtoLoader({
  location: path.join(path.dirname(new URL(import.meta.url).pathname), './'),
  files: ['service.proto']
})
