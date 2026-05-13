import { loader } from './loader.js'

class Greeter {
  async sayGreet(call) {
    return { message: `hello, ${call.request.name || 'world'}` }
  }
}

// Server-side middleware. ctx.path is the gRPC method path. Anything thrown
// is converted into a gRPC status by grpcity.
const accessLog = async (ctx, next) => {
  const begin = Date.now()
  try {
    await next()
    console.log(`[server ${Date.now() - begin}ms] ${ctx.path} ok`)
  } catch (err) {
    console.log(`[server ${Date.now() - begin}ms] ${ctx.path} FAILED ${err.message}`)
    throw err
  }
}

const requireAuth = async (ctx, next) => {
  // call is on ctx.request? No — server middleware sees the same `call`
  // passed to handlers via ctx (here, ctx.request is the request body, and
  // metadata is on the call object the handler receives). For auth, we
  // generally inspect the inbound metadata at handler time. This middleware
  // shows where you'd put a guard.
  await next()
}

const start = async (addr) => {
  await loader.init()

  const server = await loader.initServer()
  server.use(accessLog, requireAuth)
  server.add('helloworld.Greeter', new Greeter())

  await server.listen(addr)
  console.log('gRPC server with middleware listening on', addr)
}

start('127.0.0.1:9101')
