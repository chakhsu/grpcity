import { newLoader, pickPort } from './helpers/streamHarness'
import type { ServerReadableStream, ServerWritableStream, ServerDuplexStream } from '../src'

const SIZE = 1000

class EchoServer {
  async clientStreamHello(call: ServerReadableStream) {
    const seq: number[] = []
    for await (const m of call.readAll()) {
      seq.push(Number(m.message))
    }
    // Encode "count|firstFew|lastFew" so the client can verify ordering cheaply.
    return { message: `${seq.length}|${seq.slice(0, 3).join(',')}|${seq.slice(-3).join(',')}` }
  }

  async serverStreamHello(call: ServerWritableStream) {
    const cap = Number(call.request.message) || SIZE
    for (let i = 0; i < cap; i++) {
      call.write({ message: String(i) })
    }
    call.end()
  }

  async mutualStreamHello(call: ServerDuplexStream) {
    for await (const m of call.readAll()) {
      call.write({ message: `r:${m.message}` })
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
  server.add('stream.Hellor', new EchoServer())
  await server.listen(addr)
  const clients = await loader.initClients({ services: { 'stream.Hellor': addr } })
  return { server, client: clients.get('stream.Hellor') }
}

describe('stream scale and ordering', () => {
  test(`client stream: ${SIZE} messages in order are aggregated correctly`, async () => {
    const { server, client } = await stand()
    try {
      const call = await client.clientStreamHello()
      for (let i = 0; i < SIZE; i++) call.write({ message: String(i) })
      const { response } = await call.writeEnd()
      const [count, head, tail] = response.message.split('|')
      expect(Number(count)).toBe(SIZE)
      expect(head).toBe('0,1,2')
      expect(tail).toBe(`${SIZE - 3},${SIZE - 2},${SIZE - 1}`)
    } finally {
      await server.shutdown()
    }
  })

  test(`server stream: ${SIZE} messages are received in order`, async () => {
    const { server, client } = await stand()
    try {
      const call = await client.serverStreamHello({ message: String(SIZE) })
      let count = 0
      let lastSeen = -1
      let orderOk = true
      for await (const m of call.readAll()) {
        const n = Number(m.message)
        if (n !== lastSeen + 1) orderOk = false
        lastSeen = n
        count++
      }
      expect(count).toBe(SIZE)
      expect(lastSeen).toBe(SIZE - 1)
      expect(orderOk).toBe(true)
    } finally {
      await server.shutdown()
    }
  })

  test('bidi: 500 alternating round-trips keep request/response ordering aligned', async () => {
    const SIZE_BIDI = 500
    const { server, client } = await stand()
    try {
      const call = await client.mutualStreamHello()
      const echoes: string[] = []
      const consume = (async () => {
        for await (const m of call.readAll()) {
          echoes.push(m.message)
        }
      })()
      for (let i = 0; i < SIZE_BIDI; i++) call.write({ message: String(i) })
      call.writeEnd()
      await consume
      expect(echoes).toHaveLength(SIZE_BIDI)
      expect(echoes[0]).toBe('r:0')
      expect(echoes[SIZE_BIDI - 1]).toBe(`r:${SIZE_BIDI - 1}`)
      // every entry follows the previous one
      for (let i = 0; i < SIZE_BIDI; i++) {
        if (echoes[i] !== `r:${i}`) {
          throw new Error(`out-of-order at index ${i}: ${echoes[i]}`)
        }
      }
    } finally {
      await server.shutdown()
    }
  }, 20000)
})
