import { ProtoLoader } from '../../lib/index.js'
// same as import { ProtoLoader } from 'grpcity'

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// get this file dir path
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const loader = new ProtoLoader({
  location: path.join(__dirname, '../proto'),
  files: ['helloworld/service.proto']
})

export const serverCredentials = loader.makeServerCredentials(
  fs.readFileSync(path.resolve(__dirname, '../certs/ca.crt')),
  [
    {
      private_key: fs.readFileSync(path.resolve(__dirname, '../certs/server.key')),
      cert_chain: fs.readFileSync(path.resolve(__dirname, '../certs/server.crt'))
    }
  ],
  true
)

export const clientCredentials = loader.makeClientCredentials(
  fs.readFileSync(path.resolve(__dirname, '../certs/ca.crt')),
  fs.readFileSync(path.resolve(__dirname, '../certs/client.key')),
  fs.readFileSync(path.resolve(__dirname, '../certs/client.crt'))
)
