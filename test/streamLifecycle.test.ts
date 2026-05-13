import { newLoader, pickPort } from './helpers/streamHarness'
import type { ServerReadableStream, ServerWritableStream, ServerDuplexStream } from '../src'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

class SlowServer {
  cancelObserved = false

  async unaryHello() {
    await delay(200)
    return { message: 'late' }
  }

  async clientStreamHello(call: ServerReadableStream) {
    const collected: string[] = []
    for await (const msg of call.readAll()) {
      collected.push(msg.message)
    }
    return { message: `count=${collected.length}` }
  }

  async serverStreamHello(call: ServerWritableStream) {
    call.on('cancelled', () => {
      this.cancelObserved = true
    })
    for (let i = 0; i < 100; i++) {
      if (call.cancelled) break
      call.write({ message: `msg-${i}` })
      await delay(20)
    }
    call.end()
  }

  async mutualStreamHello(call: ServerDuplexStream) {
    let count = 0
    for await (const _ of call.readAll()) {
      count++
    }
    call.write({ message: `echo:${count}` })
    call.end()
  }
}

const stand = async () => {
  const loader = newLoader()
  await loader.init()
  const port = await pickPort()
  const addr = { host: '127.0.0.1', port }
  const server = await loader.initServer()
  const impl = new SlowServer()
  server.add('stream.Hellor', impl)
  await server.listen(addr)
  return { server, impl, addr, loader }
}

describe('stream lifecycle', () => {
  describe('deadline', () => {
    test('unary deadline exceeded surfaces as a non-OK error', async () => {
      const { server, loader, addr } = await stand()
      try {
        const clients = await loader.initClients({ services: { 'stream.Hellor': addr } })
        const client = clients.get('stream.Hellor', { timeout: 50 })
        await expect(client.unaryHello({ message: 'x' })).rejects.toThrow(/DEADLINE_EXCEEDED/)
      } finally {
        await server.shutdown()
      }
    })

    test('server-stream deadline exceeded surfaces during consumption', async () => {
      const { server, loader, addr } = await stand()
      try {
        const clients = await loader.initClients({ services: { 'stream.Hellor': addr } })
        const client = clients.get('stream.Hellor', { timeout: 60 })
        const call = await client.serverStreamHello({ message: 'go' })
        await expect(
          (async () => {
            for await (const _ of call.readAll()) {
              // drain until the deadline fires
            }
          })()
        ).rejects.toThrow(/DEADLINE_EXCEEDED/)
      } finally {
        await server.shutdown()
      }
    })
  })

  describe('cancel', () => {
    test('client.cancel() on a server stream stops further consumption', async () => {
      const { server, impl, loader, addr } = await stand()
      try {
        const clients = await loader.initClients({ services: { 'stream.Hellor': addr } })
        const client = clients.get('stream.Hellor')
        const call = await client.serverStreamHello({ message: 'go' })
        // grpc-js emits a CANCELLED error after cancel(); swallow it so it
        // doesn't surface as an unhandled rejection in jest.
        call.on('error', () => {})

        let received = 0
        try {
          for await (const _ of call.readAll()) {
            received++
            if (received === 2) {
              call.cancel()
              break
            }
          }
        } catch {
          // for-await may reject after cancel — that's acceptable
        }
        expect(received).toBeGreaterThanOrEqual(1)
        // Give the server a beat to observe the cancelled flag.
        await delay(50)
        expect(impl.cancelObserved || call.cancelled === true).toBe(true)
      } finally {
        await server.shutdown()
      }
    })
  })

  describe('empty streams', () => {
    test('client stream: writeEnd without any write returns count=0', async () => {
      const { server, loader, addr } = await stand()
      try {
        const clients = await loader.initClients({ services: { 'stream.Hellor': addr } })
        const client = clients.get('stream.Hellor')
        const call = await client.clientStreamHello()
        const { response, status } = await call.writeEnd()
        expect(response.message).toBe('count=0')
        expect(status.code).toBe(0)
      } finally {
        await server.shutdown()
      }
    })

    test('bidi stream: sending zero messages still completes cleanly', async () => {
      const { server, loader, addr } = await stand()
      try {
        const clients = await loader.initClients({ services: { 'stream.Hellor': addr } })
        const client = clients.get('stream.Hellor')
        const call = await client.mutualStreamHello()
        call.writeEnd()
        const received: string[] = []
        for await (const data of call.readAll()) {
          received.push(data.message)
        }
        expect(received).toEqual(['echo:0'])
        const { status } = await call.readEnd()
        expect(status.code).toBe(0)
      } finally {
        await server.shutdown()
      }
    })
  })
})
