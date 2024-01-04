import { loader, serverCredentials as credentials } from './loader.js'

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

class Hellor {
  constructor() {
    this.count = 0
  }

  init(server) {
    server.add('helloworld.Hellor', this, { exclude: ['init'] })
  }

  async SayHello(call) {
    const metadata = call.metadata.clone()
    metadata.add('x-timestamp-server', 'received=' + new Date().toISOString())
    call.sendMetadata(metadata)
    if (metadata.get('x-throw-error').length > 0) {
      throw new Error('throw error because x-throw-error')
    }

    if (metadata.get('x-long-delay').length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * 10))
    }

    this.count++

    return {
      message: `hello, ${call.request.name || 'world'}`,
      count: this.count
    }
  }

  async SayHello2(call) {
    return this.SayHello(call)
  }
}

const middlewareA = async (ctx, next) => {
  const beginTime = new Date().getTime()
  console.log('middlewareA: 1', ctx, beginTime)
  await timeout(1000)
  await next()
  await timeout(1000)
  const endTime = new Date().getTime()
  console.log('middlewareA: 2', ctx, endTime, endTime - beginTime)
}

const middlewareB = async (ctx, next) => {
  const beginTime = new Date().getTime()
  console.log('middlewareB: 1', ctx, beginTime)
  await next()
  const endTime = new Date().getTime()
  console.log('middlewareB: 2', ctx, endTime, endTime - beginTime)
}

const start = async (addr) => {
  await loader.init({
    isDev: true,
    packagePrefix: 'dev'
  })

  const server = await loader.initServer()
  server.use(middlewareA, middlewareB)
  // server.use([middlewareA, middlewareB])
  // server.use(middlewareA)
  // server.use(middlewareB)

  const servicers = [new Greeter(), new Hellor()]
  servicers.map((s) => s.init(server))

  await server.listen(addr, credentials)
  console.log('start:', addr)
}

start('localhost:9099')
