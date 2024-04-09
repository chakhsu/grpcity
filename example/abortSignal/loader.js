import { ProtoLoader } from '../../lib/index.js'
// same as import { ProtoLoader } from 'grpcity'

import path from 'node:path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

export const loader = new ProtoLoader({
  location: path.join(__dirname, '../proto'),
  files: ['helloworld/service.proto']
})
