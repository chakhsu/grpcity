import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ProtoLoader } from 'grpcity'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const loader = new ProtoLoader({
  location: path.join(__dirname, '../proto'),
  files: ['helloworld/service.proto']
})
