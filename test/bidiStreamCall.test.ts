import path from 'node:path'
import { ProtoLoader } from '../src'
import type { ServerDuplexStream } from '../src'

const timeout = (ms: number) => {
  return new Promise((resolve, reject) => setTimeout(resolve, ms))
}

describe('gRPC Bidi Stream Call', () => {
  const addr = { host: '127.0.0.1', port: 12505 }

  class AsyncStream {
    async mutualStreamHello(call: ServerDuplexStream) {
      const metadata = call.metadata.clone()
      metadata.add('x-timestamp-server', 'received=' + new Date().toISOString())
      call.sendMetadata(metadata)

      call.write({ message: 'emmm...' })

      for await (const data of call.readAll()) {
        expect(typeof data).toBe('object')
        if (data.message === 'Hello!') {
          call.write({ message: 'Hello too.' })
        } else if (data.message === 'How are you?') {
          call.write({ message: "I'm fine, thank you" })
          await timeout(500)
          call.write({ message: 'delay 500ms' })
          call.writeAll([{ message: 'emm... ' }, { message: 'emm......' }])
        } else {
          call.write({ message: 'pardon?' })
        }
      }

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

    const mutualStreamHelloCall = await client.mutualStreamHello()
    mutualStreamHelloCall.writeAll([{ message: 'Hello!' }, { message: 'How are you?' }, { message: 'other thing x' }])
    mutualStreamHelloCall.write({ message: 'maybe' })

    const mutualReadAllResult = mutualStreamHelloCall.readAll()
    for await (const data of mutualReadAllResult) {
      if (data.message === 'delay 500ms') {
        mutualStreamHelloCall.write({ message: 'ok, I known you delay 1s' })
        mutualStreamHelloCall.writeEnd()
      }
      expect(typeof data).toBe('object')
    }

    const { status, peer, metadata, response } = await mutualStreamHelloCall.readEnd()

    expect(!response).toBeTruthy
    expect(status.code).toBe(0)
    expect(metadata.get('x-service-path')[0]).toBe('/stream.Hellor/MutualStreamHello')
    expect(typeof peer).toBe('string')

    await server.shutdown()
  })

  test('Should signal abort immediately form client', async () => {
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

    const ac = new AbortController()
    const { signal } = ac
    ac.abort()

    try {
      await client.mutualStreamHello(null, { signal })
    } catch (err: any) {
      expect(err.code).toBe(20)
      expect(err.name).toBe('AbortError')
      expect(err.message).toBe('This operation was aborted')
    }

    await server.shutdown()
  })

  test('Should signal abort 100ms interval form client', async () => {
    loader.init()

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

    const ac = new AbortController()
    const { signal } = ac
    setTimeout(() => {
      ac.abort()
    }, 100)

    try {
      const mutualStreamHelloCall = await client.mutualStreamHello(null, { signal })
      mutualStreamHelloCall.writeAll([{ message: 'How are you?' }])
    } catch (err: any) {
      expect(err.code).toBe(1)
      expect(err.name).toBe('GrpcClientError')
      expect(/Cancelled on client/i.test(err.message)).toBeTruthy
    }

    await server.shutdown()
  })
})
