// 01-default.js — calling init() with no arguments.
//
// What it shows:
//  - You only need to call loader.init() once. Subsequent calls return the
//    same in-flight promise; calls after init has resolved are a no-op.
//  - Without isDev/packagePrefix, services and types are accessed by their
//    fully qualified protobuf name.
//  - The default loadOptions are: keepCase=true, longs=String, enums=String,
//    defaults=false, oneofs=true. (See 03-load-options.js to override them.)

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ProtoLoader } from 'grpcity'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const loader = new ProtoLoader({
  location: path.join(__dirname, '../proto'),
  files: ['helloworld/service.proto']
})

class Greeter {
  async sayGreet(call) {
    return { message: `hello, ${call.request.name || 'world'}` }
  }
}

const start = async () => {
  // No arguments — default behaviour.
  await loader.init()

  // service() / type() resolve by fully qualified name.
  console.log('service:', loader.service('helloworld.Greeter') ? 'found' : 'missing')

  const addr = '127.0.0.1:9201'
  const server = await loader.initServer()
  server.add('helloworld.Greeter', new Greeter())
  await server.listen(addr)

  const clients = await loader.initClients({
    services: { 'helloworld.Greeter': addr }
  })
  const { response } = await clients.get('helloworld.Greeter').sayGreet({ name: 'init' })
  console.log('sayGreet ←', response)

  await server.shutdown()
}

start()
