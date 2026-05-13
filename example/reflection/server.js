import { loader } from './loader.js'

class Greeter {
  async sayGreet(call) {
    return { message: `hello, ${call.request.name || 'world'}` }
  }
}

const start = async (addr) => {
  await loader.init()

  const reflection = await loader.initReflection()

  const server = await loader.initServer()
  server.add('helloworld.Greeter', new Greeter())
  // Mount the reflection service so tools like grpcurl can discover the
  // server's services without a local copy of the .proto files.
  server.inject(reflection)

  await server.listen(addr)
  console.log('gRPC server with reflection listening on', addr)
  console.log('Try: grpcurl -plaintext', addr, 'list')
}

start('127.0.0.1:9098')
