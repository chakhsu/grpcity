import { newLoader, pickPort } from './helpers/streamHarness'
import type { ServerReadableStream, ServerWritableStream, ServerDuplexStream } from '../src'

class FaultyServer {
  async unaryHello() {
    throw new Error('unary boom')
  }
  async clientStreamHello(_call: ServerReadableStream) {
    throw new Error('client stream boom')
  }
  async serverStreamHello(_call: ServerWritableStream) {
    throw new Error('server stream boom')
  }
  async mutualStreamHello(_call: ServerDuplexStream) {
    throw new Error('bidi boom')
  }
}

const stand = async () => {
  const loader = newLoader()
  await loader.init()
  const port = await pickPort()
  const addr = { host: '127.0.0.1', port }
  const server = await loader.initServer()
  server.add('stream.Hellor', new FaultyServer())
  await server.listen(addr)
  const clients = await loader.initClients({ services: { 'stream.Hellor': addr } })
  return { server, client: clients.get('stream.Hellor') }
}

describe('stream errors: server-side throw surfaces on the client', () => {
  test('unary throw propagates with the original message', async () => {
    const { server, client } = await stand()
    try {
      await expect(client.unaryHello({ message: 'x' })).rejects.toThrow(/unary boom/)
    } finally {
      await server.shutdown()
    }
  })

  test('client stream throw surfaces from writeEnd()', async () => {
    const { server, client } = await stand()
    try {
      const call = await client.clientStreamHello()
      call.write({ message: 'a' })
      call.write({ message: 'b' })
      await expect(call.writeEnd()).rejects.toThrow(/client stream boom/)
    } finally {
      await server.shutdown()
    }
  })

  test('server stream throw surfaces from for-await consumption', async () => {
    const { server, client } = await stand()
    try {
      const call = await client.serverStreamHello({ message: 'x' })
      await expect(
        (async () => {
          for await (const _ of call.readAll()) {
            // exhaust until the failure
          }
        })()
      ).rejects.toThrow(/server stream boom/)
    } finally {
      await server.shutdown()
    }
  })

  test('bidi throw surfaces from for-await consumption', async () => {
    const { server, client } = await stand()
    try {
      const call = await client.mutualStreamHello()
      call.write({ message: 'hi' })
      call.writeEnd()
      await expect(
        (async () => {
          for await (const _ of call.readAll()) {
            // exhaust until the failure
          }
        })()
      ).rejects.toThrow(/bidi boom/)
    } finally {
      await server.shutdown()
    }
  })
})
