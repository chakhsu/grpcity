import path from 'node:path'
import { ProtoLoader } from '../src'
import type { ServerWritableStream } from '../src'

describe('gRPC Server Stream Call', () => {
  const addr = { host: '127.0.0.1', port: 12405 }

  class AsyncStream {
    async serverStreamHello(call: ServerWritableStream) {
      const metadata = call.metadata.clone()
      metadata.add('x-timestamp-server', 'received=' + new Date().toISOString())
      call.sendMetadata(metadata)

      expect(call.request.message).toBe('hello grpcity')

      call.write({ message: 'Hello! I got you message.' })
      call.write({ message: "I'm fine, thank you" })
      call.writeAll([{ message: 'other thing x' }, { message: 'other thing y' }])
      call.end()
    }
  }

  const loader = new ProtoLoader({
    location: path.join(__dirname, '../example/proto'),
    files: ['stream/service.proto']
  })

  test('Should server stream from client to server', async () => {
    await loader.init()

    // server
    const server = await loader.initServer()
    server.add('stream.Hellor', new AsyncStream())
    await server.listen(addr)

    // client
    const clients = await loader.initClients({
      services: {
        'stream.Hellor': addr
      }
    })

    const client = clients.get('stream.Hellor')

    const serverStreamHelloCall = await client.serverStreamHello({ message: 'hello grpcity' })
    const serverReadAllResult = serverStreamHelloCall.readAll()

    let count = 0
    for await (const data of serverReadAllResult) {
      expect(typeof data).toBe('object')
      count++
    }
    expect(count).toBe(4)

    const { status, peer, metadata, response } = await serverStreamHelloCall.readEnd()

    expect(!response).toBeTruthy
    expect(status.code).toBe(0)
    expect(metadata.get('x-service-path')[0]).toBe('/stream.Hellor/ServerStreamHello')
    expect(typeof peer).toBe('string')

    await server.shutdown()
  })
})
