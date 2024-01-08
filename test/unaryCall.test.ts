import fs from 'node:fs'
import path from 'node:path'
import { ProtoLoader } from '../src'
import type { Metadata, ServerUnaryCall, StatusObject, ServerContext, Next, ClientContext } from '../src'

const timeout = (ms: number) => {
  return new Promise((resolve, reject) => setTimeout(resolve, ms))
}

describe('gRPC Unary Call', () => {
  const addr = { host: '127.0.0.1', port: 12305 }

  class Greeter {
    async sayGreet(call: ServerUnaryCall) {
      const metadata = call.metadata.clone()
      metadata.add('x-timestamp-server', 'received=' + Date.now())
      call.sendMetadata(metadata)
      if (metadata.get('x-throw-error').length > 0) {
        throw new Error('throw error because x-throw-error')
      }

      if (metadata.get('x-long-delay').length > 0) {
        await timeout(500)
      }

      expect(typeof this).toBe('object')

      return {
        message: `hello, ${call.request.name || 'world'}`
      }
    }

    async sayGreet2(call: ServerUnaryCall) {
      return this.sayGreet(call)
    }
  }

  const GreeterObject = {
    sayGreet: async (call: ServerUnaryCall) => {
      const metadata = call.metadata.clone()
      metadata.add('x-timestamp-server', 'received=' + Date.now())
      call.sendMetadata(metadata)
      if (metadata.get('x-throw-error').length > 0) {
        throw new Error('throw error because x-throw-error')
      }

      if (metadata.get('x-long-delay').length > 0) {
        await timeout(500)
      }

      expect(typeof this).toBe('object')

      return {
        message: `hello, ${call.request.name || 'world'}`
      }
    },
    sayGreet2: async (call: ServerUnaryCall) => {
      return GreeterObject.sayGreet(call)
    }
  }

  const loader = new ProtoLoader({
    location: path.join(__dirname, '../example/proto'),
    files: ['helloworld/service.proto']
  })

  test('Should async sayGreet from client to server', async () => {
    await loader.init()

    // server
    const server = await loader.initServer()
    server.add('helloworld.Greeter', new Greeter())
    await server.listen(addr)

    // client
    const clients = await loader.initClients({
      services: { 'helloworld.Greeter': addr }
    })
    const greeterClient = clients.get('helloworld.Greeter')
    const { status, metadata, peer, response } = await greeterClient.sayGreet({ name: 'grpcity' })

    expect(typeof response).toBe('object')
    expect(response.message).toBe('hello, grpcity')
    expect(status.code).toBe(0)
    expect(metadata.get('x-service-path')[0]).toBe('/helloworld.Greeter/SayGreet')
    expect(peer).toBe(addr.host + ':' + addr.port)

    await server.shutdown()
  })

  test('Should async sayGreet2 from client to server', async () => {
    await loader.init()

    // server
    const server = await loader.initServer()
    server.add('helloworld.Greeter', GreeterObject)
    await server.listen(addr)

    // client
    const clients = await loader.initClients({
      services: { 'helloworld.Greeter': addr }
    })
    const greeterClient = clients.get('helloworld.Greeter', { url: addr.host + ':' + addr.port })
    const { status, metadata, peer, response } = await greeterClient.sayGreet2({ name: 'test2' })

    expect(typeof response).toBe('object')
    expect(response.message).toBe('hello, test2')
    expect(status.code).toBe(0)
    expect(metadata.get('x-service-path')[0]).toBe('/helloworld.Greeter/SayGreet2')
    expect(peer).toBe(addr.host + ':' + addr.port)

    await server.shutdown()
  })

  test('Should callback sayGreet from client to server', async () => {
    await loader.init()

    // server
    const server = await loader.initServer()
    server.add('helloworld.Greeter', new Greeter())
    await server.listen(addr)

    // client
    const clients = await loader.initClients({
      services: { 'helloworld.Greeter': addr }
    })
    const greeterClient = clients.get('helloworld.Greeter')

    const meta = loader.makeMetadata({
      'x-test-name': 'grpcity'
    })

    const { status, metadata, peer, response } = (await new Promise((resolve, reject) => {
      const result: any = {}
      const call = greeterClient.call.sayGreet({ name: 'grpcity' }, meta, (err: Error, response: any) => {
        if (err) {
          reject(err)
        } else {
          result.response = response
        }
      })
      result.peer = call.getPeer()
      call.on('metadata', (metadata: Metadata) => {
        result.metadata = metadata
      })
      call.on('status', (status: StatusObject) => {
        result.status = status
        resolve(result)
      })
    })) as any

    expect(typeof response).toBe('object')
    expect(response.message).toBe('hello, grpcity')
    expect(status.code).toBe(0)
    expect(metadata.get('x-test-name')[0]).toBe('grpcity')
    expect(peer.includes(addr.host + ':' + addr.port)).toBeTruthy

    await server.shutdown()
  })

  test('Should use metadata on client and server', async () => {
    await loader.init()

    // server
    const server = await loader.initServer()
    server.add('helloworld.Greeter', new Greeter())
    await server.listen(addr)

    // client
    const clients = await loader.initClients({
      services: { 'helloworld.Greeter': addr }
    })
    const greeterClient = clients.get('helloworld.Greeter')

    const timestampClientSend = Date.now()
    const meta = loader.makeMetadata({
      'x-cache-control': 'max-age=100',
      'x-business-id': ['grpcity', 'testing'],
      'x-timestamp-client': 'begin=' + timestampClientSend
    })

    const { metadata } = await greeterClient.sayGreet({ name: 'grpcity' }, meta)

    expect(metadata.get('x-cache-control')).toStrictEqual(['max-age=100'])
    expect(metadata.get('x-business-id')).toStrictEqual(['grpcity, testing'])
    expect(metadata.get('x-service-path')[0]).toBe('/helloworld.Greeter/SayGreet')

    const timestamps = metadata.get('x-timestamp-server')
    expect(Array.isArray(timestamps)).toBeTruthy
    expect(timestamps.length === 1).toBeTruthy
    const timestampServerReceived = Number(timestamps[0].split('=')[1])
    const timeUsed = timestampServerReceived - timestampClientSend
    expect(timeUsed < 100).toBeTruthy

    await server.shutdown()
  })

  test('Should cache server error', async () => {
    await loader.init()

    // server
    const server = await loader.initServer()
    server.add('helloworld.Greeter', new Greeter())
    await server.listen(addr)

    // client
    const clients = await loader.initClients({
      services: { 'helloworld.Greeter': addr }
    })
    const greeterClient = clients.get('helloworld.Greeter')
    const meta = loader.makeMetadata({ 'x-throw-error': 'true' })

    try {
      await greeterClient.sayGreet({ name: 'grpcity' }, meta)
    } catch (err: any) {
      expect(err.code).toBe(13)
      expect(err.name).toBe('GrpcClientError')
      expect(/x-throw-error/.test(err.message)).toBeTruthy
      expect(/SayGreet/i.test(err.message)).toBeTruthy
    }

    await server.shutdown()
  })

  test('Should use timeout on client and server', async () => {
    await loader.init()

    // server
    const server = await loader.initServer()
    server.add('helloworld.Greeter', new Greeter())
    await server.listen(addr)

    // client
    const clients = await loader.initClients({
      services: { 'helloworld.Greeter': addr }
    })
    const timeout = 100
    const greeterClient = clients.get('helloworld.Greeter', { timeout })
    const meta = loader.makeMetadata({ 'x-long-delay': 'true' })

    const start = Date.now()
    try {
      await greeterClient.sayGreet({ name: 'grpcity' }, meta)
    } catch (err: any) {
      expect(Date.now() - start < timeout * 1.5).toBeTruthy
      expect(err.code).toBe(4)
      expect(/Deadline/i.test(err.message)).toBeTruthy
      expect(/SayGreet/i.test(err.message)).toBeTruthy
    }

    await server.shutdown()
  })

  test('Should use certs on client and server', async () => {
    const addr = 'localhost:12306'
    await loader.init()

    const serverCredentials = loader.makeServerCredentials(
      fs.readFileSync(path.resolve(__dirname, '../example/certs/ca.crt')),
      [
        {
          private_key: fs.readFileSync(path.resolve(__dirname, '../example/certs/server.key')),
          cert_chain: fs.readFileSync(path.resolve(__dirname, '../example/certs/server.crt'))
        }
      ],
      true
    )

    const clientCredentials = loader.makeClientCredentials(
      fs.readFileSync(path.resolve(__dirname, '../example/certs/ca.crt')),
      fs.readFileSync(path.resolve(__dirname, '../example/certs/client.key')),
      fs.readFileSync(path.resolve(__dirname, '../example/certs/client.crt'))
    )

    // server
    const server = await loader.initServer()
    server.add('helloworld.Greeter', new Greeter())
    await server.listen(addr, serverCredentials)

    // client
    const clients = await loader.initClients({
      services: { 'helloworld.Greeter': addr },
      credentials: clientCredentials
    })

    const greeterClient = clients.get('helloworld.Greeter')
    const { status, metadata, peer, response } = await greeterClient.sayGreet({ name: 'credentials' })

    expect(typeof response).toBe('object')
    expect(response.message).toBe('hello, credentials')
    expect(status.code).toBe(0)
    expect(metadata.get('x-service-path')[0]).toBe('/helloworld.Greeter/SayGreet')
    expect(peer).toBe('::1:12306')

    try {
      const clientsWithoutCredentials = await loader.initClients({
        services: { 'helloworld.Greeter': addr }
      })
      const greeterClient = clientsWithoutCredentials.get('helloworld.Greeter')
      await greeterClient.sayGreet({ name: 'credentials' })
    } catch (err: any) {
      expect(/UNAVAILABLE/i.test(err.message)).toBeTruthy
      expect(/SayGreet/i.test(err.message)).toBeTruthy
    }

    await server.shutdown()
  })

  test('Should use middleware on client and server', async () => {
    await loader.init()

    // server
    const serverMiddleware = async (ctx: ServerContext, next: Next) => {
      expect(!ctx.response).toBeTruthy
      if (ctx.request) {
        ctx.request.name = ctx.request.name + '1'
      }
      await next()
      if (ctx.response) {
        ctx.response.message = ctx.response.message + '2'
      }
      expect(!!ctx.response).toBeTruthy
    }

    const server = await loader.initServer()
    server.use(serverMiddleware)
    server.add('helloworld.Greeter', new Greeter())
    await server.listen(addr)

    // client
    const clientMiddleware = async (ctx: ClientContext, next: Next) => {
      expect(!ctx.response).toBeTruthy
      if (ctx.request) {
        ctx.request.name = ctx.request.name + '3'
      }
      await next()
      expect(!!ctx.response).toBeTruthy
      if (ctx.response) {
        ctx.response.message = ctx.response.message + '4'
      }
    }

    const clients = await loader.initClients({
      services: { 'helloworld.Greeter': addr }
    })
    clients.use(clientMiddleware)
    const greeterClient = clients.get('helloworld.Greeter')
    const { status, metadata, peer, response } = await greeterClient.sayGreet({ name: 'grpcity' })

    expect(typeof response).toBe('object')
    expect(response.message).toBe('hello, grpcity3124')
    expect(status.code).toBe(0)
    expect(metadata.get('x-service-path')[0]).toBe('/helloworld.Greeter/SayGreet')
    expect(peer).toBe(addr.host + ':' + addr.port)

    await server.shutdown()
  })
})
