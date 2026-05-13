import { loader } from './loader.js'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

class Greeter {
  async sayGreet(call) {
    // Simulate slow work so the client has time to cancel.
    await delay(300)
    return { message: `hello, ${call.request.name || 'world'}` }
  }
}

const start = async (addr) => {
  await loader.init()
  const server = await loader.initServer()
  server.add('helloworld.Greeter', new Greeter())
  await server.listen(addr)
  console.log('gRPC server listening on', addr)
}

start('127.0.0.1:9301')
