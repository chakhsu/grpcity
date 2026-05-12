import { Metadata } from '@grpc/grpc-js'
import { newLoader, pickPort } from './helpers/streamHarness'
import type { ServerReadableStream, ServerWritableStream, ServerDuplexStream } from '../src'

// Server reads a custom request header and sends back two response surfaces:
// - response headers via sendMetadata()
// - trailing metadata via the trailer map / call.end(trailers) where supported
class EchoServer {
  async unaryHello(call: any) {
    const tenant = call.metadata.get('x-tenant')[0] || 'unknown'
    const headers = new Metadata()
    headers.set('x-echo-tenant', String(tenant))
    headers.set('x-echo-via', 'unary')
    call.sendMetadata(headers)
    return { message: `tenant=${tenant}` }
  }

  async clientStreamHello(call: ServerReadableStream) {
    const tenant = call.metadata.get('x-tenant')[0] || 'unknown'
    const headers = new Metadata()
    headers.set('x-echo-tenant', String(tenant))
    headers.set('x-echo-via', 'client-stream')
    call.sendMetadata(headers)
    let n = 0
    for await (const _ of call.readAll()) n++
    return { message: `count=${n};tenant=${tenant}` }
  }

  async serverStreamHello(call: ServerWritableStream) {
    const tenant = call.metadata.get('x-tenant')[0] || 'unknown'
    const headers = new Metadata()
    headers.set('x-echo-tenant', String(tenant))
    headers.set('x-echo-via', 'server-stream')
    call.sendMetadata(headers)
    call.write({ message: `tenant=${tenant}` })
    call.end()
  }

  async mutualStreamHello(call: ServerDuplexStream) {
    const tenant = call.metadata.get('x-tenant')[0] || 'unknown'
    const headers = new Metadata()
    headers.set('x-echo-tenant', String(tenant))
    headers.set('x-echo-via', 'bidi')
    call.sendMetadata(headers)
    for await (const m of call.readAll()) {
      call.write({ message: `${m.message}@${tenant}` })
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

const headerWithTenant = (tenant: string): Metadata => {
  const md = new Metadata()
  md.set('x-tenant', tenant)
  return md
}

describe('stream metadata round-trip', () => {
  test('unary: server reads request metadata and echoes via response headers', async () => {
    const { server, client } = await stand()
    try {
      const { response, metadata } = await client.unaryHello({ message: 'x' }, headerWithTenant('acme'))
      expect(response.message).toBe('tenant=acme')
      expect(metadata.get('x-echo-tenant')[0]).toBe('acme')
      expect(metadata.get('x-echo-via')[0]).toBe('unary')
    } finally {
      await server.shutdown()
    }
  })

  test('client stream: custom metadata reaches the server and headers are echoed back', async () => {
    const { server, client } = await stand()
    try {
      const call = await client.clientStreamHello(headerWithTenant('beta'))
      call.write({ message: '1' })
      call.write({ message: '2' })
      const { response, metadata } = await call.writeEnd()
      expect(response.message).toBe('count=2;tenant=beta')
      expect(metadata.get('x-echo-tenant')[0]).toBe('beta')
      expect(metadata.get('x-echo-via')[0]).toBe('client-stream')
    } finally {
      await server.shutdown()
    }
  })

  test('server stream: header metadata is delivered before any data', async () => {
    const { server, client } = await stand()
    try {
      const call = await client.serverStreamHello({ message: 'x' }, headerWithTenant('gamma'))
      const items: string[] = []
      for await (const m of call.readAll()) {
        items.push(m.message)
      }
      const { metadata } = await call.readEnd()
      expect(items).toEqual(['tenant=gamma'])
      expect(metadata.get('x-echo-tenant')[0]).toBe('gamma')
      expect(metadata.get('x-echo-via')[0]).toBe('server-stream')
    } finally {
      await server.shutdown()
    }
  })

  test('bidi: header echoed and per-message tenant suffix is applied', async () => {
    const { server, client } = await stand()
    try {
      const call = await client.mutualStreamHello(headerWithTenant('delta'))
      call.write({ message: 'a' })
      call.write({ message: 'b' })
      call.writeEnd()
      const echoes: string[] = []
      for await (const m of call.readAll()) {
        echoes.push(m.message)
      }
      const { metadata } = await call.readEnd()
      expect(echoes).toEqual(['a@delta', 'b@delta'])
      expect(metadata.get('x-echo-tenant')[0]).toBe('delta')
      expect(metadata.get('x-echo-via')[0]).toBe('bidi')
    } finally {
      await server.shutdown()
    }
  })
})
