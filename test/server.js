const GrpcLoader = require('..')
const path = require('path')
const fs = require('fs')

const timeout = (ms) => {
  return new Promise((resolve, reject) => setTimeout(resolve, ms))
}

class Greeter {
  constructor () {
    this.count = 0
  }

  async init (server) {
    server.addService('test.helloworld.Greeter', this, { exclude: ['init'] })
  }

  async SayHello (call) {
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
    this.count++

    return { message: `hello, ${call.request.name || 'world'}`, name_count: this.count }
  }

  async SayHello2 (call) {
    return this.SayHello(call)
  }
}

class Hellor {
  async init (server) {
    server.addService('test.helloworld.Hellor', this, { exclude: ['init'] })
  }

  async SayHello (call) {
    const metadata = call.metadata.clone()
    metadata.add('x-timestamp-server', 'received=' + new Date().toISOString())
    call.sendMetadata(metadata)
    if (metadata.get('x-throw-error').length > 0) {
      throw new Error('throw error because x-throw-error')
    }

    if (metadata.get('x-long-delay').length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * 10))
    }

    return { message: `hello, ${call.request.name || 'world'}` }
  }

  async SayHello2 (call) {
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
  const loader = new GrpcLoader({
    location: path.resolve(__dirname, 'protos'),
    files: ['test/helloworld/helloworld.proto']
  })
  await loader.init({
    isDev: true,
    packagePrefix: 'dev'
  })

  const server = loader.initServer()
  server.addMiddleware(middlewareA, middlewareB)
  // server.addMiddleware([middlewareA, middlewareB])
  // server.addMiddleware(middlewareA)
  // server.addMiddleware(middlewareB)

  const servicers = [new Greeter(), new Hellor()]
  await Promise.all(servicers.map(async s => s.init(server)))

  const credentials = server.makeServerCredentials(
    fs.readFileSync(path.resolve(__dirname, 'certs/ca.crt')), [{
      private_key: fs.readFileSync(path.resolve(__dirname, 'certs/server.key')),
      cert_chain: fs.readFileSync(path.resolve(__dirname, 'certs/server.crt'))
    }], true)

  await server.listen(addr, credentials)
  console.log('start:', addr)
}

start('localhost:9099')
