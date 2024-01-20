import { ProtoLoader } from '../../lib/index.js'
// same as import { ProtoLoader } from 'grpcity'

import path from 'node:path'
import { fileURLToPath } from 'node:url'

// get this file dir path
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const loader = new ProtoLoader({
  location: path.join(__dirname, './'),
  files: ['service.proto']
})
