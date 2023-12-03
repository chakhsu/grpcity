const GrpcLoader = require('../types')
const path = require('path')
const { expect } = require('chai')

describe('Grpc Loader', () => {
  class Greeter {
    async init(server) {
      server.addService('test.helloworld.Greeter', this, { exclude: ['init'] })
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

      expect(this).to.be.an('object')

      return { message: `hello, ${call.request.name || 'world'}` }
    }

    async SayHello2(call) {
      return this.SayHello(call)
    }
  }

  it('Should sayHello from client to server', async () => {
    const loader = new GrpcLoader({
      location: path.resolve(__dirname, 'protos'),
      files: ['test/helloworld/helloworld.proto']
    })
    await loader.init()

    expect(loader._types).is.an('object')

    const server = loader.initServer()
    const servicers = [new Greeter()]
    await Promise.all(servicers.map(async (s) => s.init(server)))
    const addr = { host: '127.0.0.1', port: 12305 }
    await server.listen(addr)

    await loader.initClients({
      services: {
        'test.helloworld.Greeter': addr.host + ':' + addr.port
      }
    })
    const client = loader.client('test.helloworld.Greeter')
    const { response: result } = await client.sayHello({ name: 'grpc' })
    expect(result).to.be.an('object')
    expect(result.message).to.be.eq('hello, grpc')

    // 支持相同service的client访问不同host和port
    const timeout = 50
    const client2 = loader.client('test.helloworld.Greeter', {
      host: 'localhost',
      port: 12305,
      timeout
    })
    const { response: result2 } = await client2.sayHello({ name: 'grpc' })
    expect(result2).to.be.an('object')
    expect(result2.message).to.be.eq('hello, grpc')

    try {
      await client2.sayHello(
        { name: 'grpc' },
        loader.makeMetadata({ 'x-throw-error': 'true' })
      )
      expect.fail('should not run here')
    } catch (err) {
      expect(/x-throw-error/.test(err.message)).to.be.eq(true)
      expect(/SayHello/i.test(err.message)).to.be.eq(true)
    }

    const start = Date.now()
    try {
      await client2.sayHello(
        { name: 'grpc' },
        loader.makeMetadata({ 'x-long-delay': 'true' })
      )
      expect.fail('should not run here')
    } catch (err) {
      expect(Date.now() - start).to.be.lte(timeout * 2)
      expect(/Deadline/i.test(err.message)).to.be.eq(true)
      expect(/SayHello/i.test(err.message)).to.be.eq(true)
    }

    await server.shutdown()
  })

  it('Should run with dev and metadata', async () => {
    const loader = new GrpcLoader({
      location: path.resolve(__dirname, 'protos'),
      files: ['test/helloworld/helloworld.proto']
    })
    await loader.init({
      isDev: true,
      packagePrefix: 'dev'
    })

    const server = loader.initServer()
    const servicers = [new Greeter()]
    await Promise.all(servicers.map(async (s) => s.init(server)))
    const addr = { host: '127.0.0.1', port: 12306 }
    await server.listen(addr)

    await loader.initClients({
      services: {
        'test.helloworld.Greeter': addr.host + ':' + addr.port
      }
    })
    const client = loader.client('test.helloworld.Greeter')

    await new Promise((resolve, reject) => {
      const timestampClientSend = new Date()
      const meta = loader.makeMetadata({
        'x-cache-control': 'max-age=100',
        'x-business-id': ['grpcity', 'testing'],
        'x-timestamp-client': 'begin=' + timestampClientSend.toISOString()
      })
      const call = client.call.sayHello(
        { name: 'grpc' },
        meta,
        (err, result) => {
          if (err) {
            reject(err)
            return
          }
          expect(result).to.be.an('object')
          expect(result.message).to.be.eq('hello, grpc')

          resolve()
        }
      )

      call.on('metadata', (metadata) => {
        expect(metadata.get('x-cache-control'))
          .to.be.an('array')
          .deep.eq(['max-age=100'])
        expect(metadata.get('x-business-id'))
          .to.be.an('array')
          .deep.eq(['grpcity, testing'])

        const timestamps = metadata.get('x-timestamp-server')
        expect(timestamps).to.be.an('array').with.lengthOf(1)
        const timestampServerReceived = new Date(timestamps[0].split('=')[1])
        const timeUsed = timestampServerReceived - timestampClientSend
        expect(timeUsed).to.gte(0).lt(100)
      })
    })

    await server.shutdown()
  })

  it('Should run with dev with different init()', async () => {
    const loader = new GrpcLoader({
      location: path.resolve(__dirname, 'protos'),
      files: ['test/helloworld/helloworld.proto']
    })
    await loader.init({
      isDev: true
    })
  })
})

describe('Grpc protobuf message', () => {
  const loader = new GrpcLoader({
    location: path.resolve(__dirname, 'protos'),
    files: ['test/helloworld/helloworld.proto']
  })

  before(async () => {
    await loader.init({
      isDev: true,
      packagePrefix: 'stage.dev'
    })
  })

  it('Should get protobuf service definition: Greeter', async () => {
    const greeterDefinition = loader.service('test.helloworld.Greeter')
    expect(greeterDefinition.SayHello).to.be.an('object')
    expect(greeterDefinition.SayHello2).to.be.an('object')
  })

  it('Should get protobuf service definition: Hellor', async () => {
    const hellorDefinition = loader.service('test.helloworld.Hellor')
    expect(hellorDefinition.SayHello).to.be.an('object')
    expect(hellorDefinition.SayHello2).to.be.an('object')
  })

  it('Should decode and encode protobuf message: HelloRequest', async () => {
    const HelloRequest = loader.message('test.helloworld.model.HelloRequest')
    const jsonData = { name: 'test' }
    const buffer = HelloRequest.encode(jsonData).finish()
    const decoded = HelloRequest.decode(buffer)
    expect(decoded).to.be.an('object')
    expect(decoded.name).to.be.eq(jsonData.name)
  })

  it('Should decode and encode protobuf message: HelloReply', async () => {
    const HelloReply = loader.message('test.helloworld.model.HelloReply')
    const jsonData = { message: 'test' }
    const buffer = HelloReply.encode(jsonData).finish()
    const decoded = HelloReply.decode(buffer)
    expect(decoded).to.be.an('object')
    expect(decoded.message).to.be.eq(jsonData.message)
  })
})
