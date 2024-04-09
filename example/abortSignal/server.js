import { loader } from './loader.js'

const timeout = (ms) => {
  return new Promise((resolve, reject) => setTimeout(resolve, ms))
}

class Greeter {
  init(server) {
    server.add('helloworld.Greeter', this, { exclude: ['init'] })
  }

  async sayGreet(call) {
    const metadata = call.metadata.clone()
    metadata.add('x-timestamp-server', 'received=' + new Date().toISOString())
    call.sendMetadata(metadata)
    if (metadata.get('x-throw-error').length > 0) {
      throw new Error('throw error because x-throw-error')
    }

    if (metadata.get('x-long-delay').length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * 10))
    }
    await timeout(1000)

    return {
      message: `hello, ${call.request.name || 'world'}`
    }
  }

  async sayGreet2(call) {
    return this.sayGreet(call)
  }
}

const middleware = async (ctx, next) => {
  const beginTime = new Date().getTime()
  console.log('middleware: 1', ctx, beginTime)
  await timeout(1000)
  await next()
  await timeout(1000)
  const endTime = new Date().getTime()
  console.log('middleware: 2', ctx, endTime, endTime - beginTime)
}

const start = async (addr) => {
  await loader.init({
    isDev: true,
    packagePrefix: 'test'
  })

  const server = await loader.initServer()
  server.use(middleware)

  const servicers = [new Greeter()]
  servicers.map((s) => s.init(server))

  await server.listen(addr)
  console.log('start:', addr)
}

start('localhost:9099')
