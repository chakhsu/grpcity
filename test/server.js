const GrpcLoader = require('..')
const path = require('path')

const timeout = (ms) => {
  return new Promise((resolve, reject) => setTimeout(resolve, ms))
}

class Greeter {
  constructor (loader) {
    this._loader = loader
  }

  async init (server) {
    server.addService(
      this._loader.service('test.helloworld.Greeter'),
      this._loader.callbackify(this, { exclude: ['init'] })
    )
  }

  async SayHello (ctx) {
    const metadata = ctx.metadata.clone()
    metadata.add('x-timestamp-server', 'received=' + new Date().toISOString())
    ctx.sendMetadata(metadata)
    if (metadata.get('x-throw-error').length > 0) {
      throw new Error('throw error because x-throw-error')
    }

    if (metadata.get('x-long-delay').length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * 10))
    }
    await timeout(1000)

    return { message: `hello, ${ctx.request.name || 'world'}`, name_count: 1 }
  }

  async SayHello2 (ctx) {
    return this.SayHello(ctx)
  }
}

class Hellor {
  constructor (loader) {
    this._loader = loader
  }

  async init (server) {
    server.addService(
      this._loader.service('test.helloworld.Hellor'),
      this._loader.callbackify(this, { exclude: ['init'] })
    )
  }

  async SayHello (ctx) {
    const metadata = ctx.metadata.clone()
    metadata.add('x-timestamp-server', 'received=' + new Date().toISOString())
    ctx.sendMetadata(metadata)
    if (metadata.get('x-throw-error').length > 0) {
      throw new Error('throw error because x-throw-error')
    }

    if (metadata.get('x-long-delay').length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * 10))
    }

    return { message: `hello, ${ctx.request.name || 'world'}` }
  }

  async SayHello2 (ctx) {
    return this.SayHello(ctx)
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

async function start (addr) {
  const loader = new GrpcLoader({
    location: path.resolve(__dirname, 'protos'),
    files: ['test/helloworld/helloworld.proto']
  })
  await loader.init()

  const server = loader.initServer()
  server.addMiddlewares([middlewareA, middlewareB])

  const servicers = [new Greeter(loader), new Hellor(loader)]
  await Promise.all(servicers.map(async s => s.init(server)))

  await server.listen(addr)
  console.log('start:', addr)
}

start({ host: '127.0.0.1', port: 9090 })
