import { loader } from './loader.js'

const start = async (addr) => {
  await loader.init()

  const clients = await loader.initClients({
    services: { 'helloworld.Greeter': addr }
  })

  // Client-side middleware: ctx exposes path, method (request/response
  // metadata), request, and after next(): response, status, peer.
  const timing = async (ctx, next) => {
    const begin = Date.now()
    await next()
    console.log(`[client ${Date.now() - begin}ms] ${ctx.path} → ${ctx.status?.code}`)
  }

  // Auth header injection: mutate the outbound metadata before next().
  const authHeader = async (ctx, next) => {
    ctx.method.metadata.set('authorization', 'Bearer demo-token')
    await next()
  }

  clients.use(timing, authHeader)

  const client = clients.get('helloworld.Greeter')
  const { response } = await client.sayGreet({ name: 'middleware' })
  console.log('sayGreet ←', response)
}

start('127.0.0.1:9101')
