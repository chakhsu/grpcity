import { loader } from './loader.js'

class Greeter {
  async sayGreet(call) {
    return { message: `hello, ${call.request.name || 'world'}` }
  }
}

class Hellor {
  async unaryHello(call) {
    return { message: `hello, ${call.request.message}` }
  }
}

// Cross-cutting middleware sees every RPC across every registered service.
const accessLog = async (ctx, next) => {
  const begin = Date.now()
  try {
    await next()
    console.log(`[${Date.now() - begin}ms] ${ctx.path} ok`)
  } catch (err) {
    console.log(`[${Date.now() - begin}ms] ${ctx.path} FAILED: ${err.message}`)
    throw err
  }
}

const start = async (addr) => {
  await loader.init()

  const server = await loader.initServer()
  server.use(accessLog)
  server.add('helloworld.Greeter', new Greeter())
  server.add('stream.Hellor', new Hellor())

  await server.listen(addr)
  console.log('gRPC multi-service server listening on', addr)
}

start('127.0.0.1:9100')
