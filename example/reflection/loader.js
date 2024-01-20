import { ProtoLoader } from '../../lib/index.js'
// same as import { ProtoLoader } from 'grpcity'

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// get this file dir path
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const helloworldLoader = new ProtoLoader({
  location: path.join(__dirname, '../proto'),
  files: ['helloworld/service.proto']
})

export const asyncStreamLoader = new ProtoLoader({
  location: path.join(__dirname, '../proto'),
  files: ['stream/service.proto']
})
