import { loader } from './loader.js'

class Greeter {
  async sayGreet(call) {
    const { name } = call.request
    return { message: `hello, ${name || 'world'}` }
  }
}

const start = async (addr) => {
  await loader.init()

  const server = await loader.initServer()
  server.add('helloworld.Greeter', new Greeter())

  await server.listen(addr)
  console.log('gRPC server listening on', addr)
}

start('127.0.0.1:9099')
