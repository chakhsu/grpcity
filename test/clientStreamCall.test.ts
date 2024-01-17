import path from 'node:path'
import { ProtoLoader } from '../src'
import type { ServerReadableStream } from '../src'

describe('gRPC Client Stream Call', () => {
  const addr = { host: '127.0.0.1', port: 12205 }

  class AsyncStream {
    async clientStreamHello(call: ServerReadableStream) {
      const metadata = call.metadata.clone()
      metadata.add('x-timestamp-server', 'received=' + new Date().toISOString())
      call.sendMetadata(metadata)

      for await (const data of call.readAll()) {
        expect(typeof data).toBe('object')
      }
      return { message: 'hello, grpcity' }
    }
  }

  const loader = new ProtoLoader({
    location: path.join(__dirname, '../example/proto'),
    files: ['stream/service.proto']
  })

  test('Should client stream from client to server', async () => {
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
    const clientStreamHelloCall = await client.clientStreamHello()
    clientStreamHelloCall.write({ message: 'Hello!' })
    clientStreamHelloCall.write({ message: 'How are you?' })
    clientStreamHelloCall.writeAll([{ message: 'How are you?' }, { message: 'So?' }])
    const { status, peer, metadata, response } = await clientStreamHelloCall.writeEnd()

    expect(typeof response).toBe('object')
    expect(response.message).toBe('hello, grpcity')
    expect(status.code).toBe(0)
    expect(metadata.get('x-service-path')[0]).toBe('/stream.Hellor/ClientStreamHello')
    expect(typeof peer).toBe('string')

    await server.shutdown()
  })
})
