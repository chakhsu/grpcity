import { getEventListeners } from 'node:events'
import { newLoader, pickPort } from './helpers/streamHarness'
import type { ServerReadableStream, ServerWritableStream, ServerDuplexStream } from '../src'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

class SlowServer {
  async unaryHello(call: any) {
    await delay(200)
    return { message: `hello, ${call.request.message || ''}` }
  }

  async clientStreamHello(call: ServerReadableStream) {
    let n = 0
    for await (const _ of call.readAll()) n++
    await delay(200)
    return { message: `count=${n}` }
  }

  async serverStreamHello(call: ServerWritableStream) {
    for (let i = 0; i < 20; i++) {
      if (call.cancelled) break
      call.write({ message: `m${i}` })
      await delay(50)
    }
    call.end()
  }

  async mutualStreamHello(call: ServerDuplexStream) {
    for await (const m of call.readAll()) {
      if (call.cancelled) break
      call.write({ message: `r:${m.message}` })
      await delay(50)
    }
    call.end()
  }
}

const stand = async () => {
  const loader = newLoader()
  await loader.init()
  const port = await pickPort()
  const addr = { host: '127.0.0.1', port }
  const server = await loader.initServer()
  server.add('stream.Hellor', new SlowServer())
  await server.listen(addr)
  const clients = await loader.initClients({ services: { 'stream.Hellor': addr } })
  return { server, client: clients.get('stream.Hellor') }
}

describe('AbortSignal: pre-abort throws synchronously without a network call', () => {
  test('unary', async () => {
    const { server, client } = await stand()
    try {
      const ac = new AbortController()
      ac.abort()
      await expect(client.unaryHello({ message: 'x' }, null, { signal: ac.signal })).rejects.toMatchObject({ name: 'AbortError' })
    } finally {
      await server.shutdown()
    }
  })

  test('client stream', async () => {
    const { server, client } = await stand()
    try {
      const ac = new AbortController()
      ac.abort()
      await expect(client.clientStreamHello(null, { signal: ac.signal })).rejects.toMatchObject({ name: 'AbortError' })
    } finally {
      await server.shutdown()
    }
  })

  test('server stream', async () => {
    const { server, client } = await stand()
    try {
      const ac = new AbortController()
      ac.abort()
      await expect(client.serverStreamHello({ message: 'x' }, null, { signal: ac.signal })).rejects.toMatchObject({
        name: 'AbortError'
      })
    } finally {
      await server.shutdown()
    }
  })

  test('bidi', async () => {
    const { server, client } = await stand()
    try {
      const ac = new AbortController()
      ac.abort()
      await expect(client.mutualStreamHello(null, { signal: ac.signal })).rejects.toMatchObject({ name: 'AbortError' })
    } finally {
      await server.shutdown()
    }
  })
})

describe('AbortSignal: mid-call abort cancels the in-flight RPC', () => {
  test('unary becomes CANCELLED', async () => {
    const { server, client } = await stand()
    try {
      const ac = new AbortController()
      setTimeout(() => ac.abort(), 50)
      try {
        await client.unaryHello({ message: 'x' }, null, { signal: ac.signal })
        throw new Error('should have thrown')
      } catch (err: any) {
        expect(err.name).toBe('GrpcClientError')
        expect(err.code).toBe(1) // CANCELLED
      }
    } finally {
      await server.shutdown()
    }
  })

  test('server stream: cancellation surfaces during consumption', async () => {
    const { server, client } = await stand()
    try {
      const ac = new AbortController()
      const call = await client.serverStreamHello({ message: 'x' }, null, { signal: ac.signal })
      // grpc-js still emits an error on the underlying stream after cancel
      call.on('error', () => {})
      setTimeout(() => ac.abort(), 80)
      let received = 0
      try {
        for await (const _ of call.readAll()) {
          received++
        }
      } catch {
        // either the loop ends cleanly with status, or it rejects — both acceptable
      }
      expect(received).toBeLessThan(20)
    } finally {
      await server.shutdown()
    }
  })

  test('bidi: cancellation stops further reads', async () => {
    const { server, client } = await stand()
    try {
      const ac = new AbortController()
      const call = await client.mutualStreamHello(null, { signal: ac.signal })
      call.on('error', () => {})
      call.write({ message: '1' })
      setTimeout(() => ac.abort(), 30)
      let received = 0
      try {
        for await (const _ of call.readAll()) {
          received++
          call.write({ message: String(received + 1) })
        }
      } catch {
        // ignore
      }
      // We at most see a couple of echoes before the cancel lands.
      expect(received).toBeLessThan(10)
    } finally {
      await server.shutdown()
    }
  })
})

describe('AbortSignal: zero-cost path when no signal is supplied', () => {
  test('unary still resolves normally', async () => {
    const { server, client } = await stand()
    try {
      const { response } = await client.unaryHello({ message: 'plain' })
      expect(response.message).toBe('hello, plain')
    } finally {
      await server.shutdown()
    }
  })
})

describe('AbortSignal: listener is removed on terminal events', () => {
  test('one signal reused across many unary calls does not accumulate listeners', async () => {
    const { server, client } = await stand()
    try {
      const ac = new AbortController()
      for (let i = 0; i < 5; i++) {
        const { response } = await client.unaryHello({ message: `n${i}` }, null, { signal: ac.signal })
        expect(response.message).toBe(`hello, n${i}`)
      }
      // Node's getEventListeners works on AbortSignal too. The proxy must
      // remove its 'abort' listener on every terminal event, otherwise a
      // long-lived signal would accumulate one listener per RPC.
      const remaining = getEventListeners(ac.signal, 'abort')
      expect(remaining).toHaveLength(0)
    } finally {
      await server.shutdown()
    }
  })
})
