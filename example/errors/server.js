import { loader } from './loader.js'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

class Greeter {
  async sayGreet(call) {
    const name = call.request.name || ''
    if (name === 'throw') {
      throw new Error('intentional failure')
    }
    if (name === 'slow') {
      await delay(2000)
    }
    return { message: `hello, ${name || 'world'}` }
  }
}

const start = async (addr) => {
  await loader.init()

  const server = await loader.initServer()
  server.add('helloworld.Greeter', new Greeter())

  await server.listen(addr)
  console.log('gRPC server (errors demo) listening on', addr)
}

start('127.0.0.1:9102')
