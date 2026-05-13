// 02-dev-prefix.js — isDev + packagePrefix.
//
// What it shows:
//  - When isDev=true and packagePrefix is set, every service and type from
//    the loaded protos is rebound under "<prefix>.<originalName>". The gRPC
//    method paths sent on the wire become "/<prefix>.<package>.<Service>/...".
//  - Server.add() and Client.get() still use the *original* name; the prefix
//    is applied transparently. This is useful for sandboxing two
//    environments (e.g. a tenant or a feature branch) on the same server
//    without changing service code.
//  - service('helloworld.Greeter') still works because grpcity resolves it
//    against the prefixed package internally.

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
    // Echo the inbound metadata so the client can see the rewritten path.
    call.sendMetadata(call.metadata.clone())
    return { message: `hello, ${call.request.name || 'world'}` }
  }
}

const start = async () => {
  await loader.init({
    isDev: true,
    packagePrefix: 'tenantA'
  })

  const addr = '127.0.0.1:9202'
  const server = await loader.initServer()
  server.add('helloworld.Greeter', new Greeter())
  await server.listen(addr)

  const clients = await loader.initClients({
    services: { 'helloworld.Greeter': addr }
  })

  const { response, metadata } = await clients.get('helloworld.Greeter').sayGreet({ name: 'prefix' })
  console.log('sayGreet ←', response)
  // The actual gRPC method path includes the prefix:
  console.log('on-the-wire path:', metadata.get('x-service-path')[0])

  await server.shutdown()
}

start()
