import path from 'node:path'
import { ProtoLoader } from '../src'
import type { MiddlewareFunction } from '../src'

const protoFile = {
  location: path.join(__dirname, '../example/proto'),
  files: ['helloworld/service.proto']
}

let nextPort = 13100
const pickPort = () => nextPort++

class Greeter {
  async sayGreet(ctx: any) {
    return { message: `hi ${ctx.request.message || ''}`.trim() }
  }
}

describe('Server public API', () => {
  describe('use()', () => {
    test('accepts a single middleware', async () => {
      const loader = new ProtoLoader(protoFile)
      await loader.init()
      const server = await loader.initServer()
      const fn: MiddlewareFunction = async (_ctx, next) => next()
      expect(() => server.use(fn)).not.toThrow()
      expect((server as any)._middleware).toHaveLength(1)
      server.forceShutdown()
    })

    test('accepts multiple middlewares as varargs', async () => {
      const loader = new ProtoLoader(protoFile)
      await loader.init()
      const server = await loader.initServer()
      const a: MiddlewareFunction = async (_ctx, next) => next()
      const b: MiddlewareFunction = async (_ctx, next) => next()
      const c: MiddlewareFunction = async (_ctx, next) => next()
      server.use(a, b, c)
      expect((server as any)._middleware).toHaveLength(3)
      server.forceShutdown()
    })

    test('accepts an array of middlewares', async () => {
      const loader = new ProtoLoader(protoFile)
      await loader.init()
      const server = await loader.initServer()
      const a: MiddlewareFunction = async (_ctx, next) => next()
      const b: MiddlewareFunction = async (_ctx, next) => next()
      ;(server.use as any)([a, b])
      expect((server as any)._middleware).toHaveLength(2)
      server.forceShutdown()
    })

    test('throws when called with no arguments', async () => {
      const loader = new ProtoLoader(protoFile)
      await loader.init()
      const server = await loader.initServer()
      expect(() => (server as any).use()).toThrow(/at least one middleware/)
      server.forceShutdown()
    })
  })

  describe('add() / remove() / inject()', () => {
    test('add() registers and remove() unregisters a service', async () => {
      const loader = new ProtoLoader(protoFile)
      await loader.init()
      const server = await loader.initServer()
      expect(() => server.add('helloworld.Greeter', new Greeter())).not.toThrow()
      expect(() => server.remove('helloworld.Greeter')).not.toThrow()
      server.forceShutdown()
    })

    test('inject() forwards to the underlying grpc.Server', async () => {
      const loader = new ProtoLoader(protoFile)
      await loader.init()
      const server = await loader.initServer()
      const inject = jest.fn()
      server.inject({ inject })
      expect(inject).toHaveBeenCalledTimes(1)
      server.forceShutdown()
    })

    test('add() throws after listen()', async () => {
      const loader = new ProtoLoader(protoFile)
      await loader.init()
      const server = await loader.initServer()
      await server.listen({ host: '127.0.0.1', port: pickPort() })
      expect(() => server.add('helloworld.Greeter', new Greeter())).toThrow(/must not have listened/)
      await server.shutdown()
    })

    test('inject() throws after listen()', async () => {
      const loader = new ProtoLoader(protoFile)
      await loader.init()
      const server = await loader.initServer()
      await server.listen({ host: '127.0.0.1', port: pickPort() })
      const inject = jest.fn()
      expect(() => server.inject({ inject })).toThrow(/must not have listened/)
      await server.shutdown()
    })

    test('use() throws after listen()', async () => {
      const loader = new ProtoLoader(protoFile)
      await loader.init()
      const server = await loader.initServer()
      await server.listen({ host: '127.0.0.1', port: pickPort() })
      const fn: MiddlewareFunction = async (_ctx, next) => next()
      expect(() => server.use(fn)).toThrow(/must not have listened/)
      await server.shutdown()
    })
  })

  describe('listen()', () => {
    test('accepts a host:port string', async () => {
      const loader = new ProtoLoader(protoFile)
      await loader.init()
      const server = await loader.initServer()
      const port = pickPort()
      await server.listen(`127.0.0.1:${port}`)
      await server.shutdown()
    })

    test('rejects an address string without a colon', async () => {
      const loader = new ProtoLoader(protoFile)
      await loader.init()
      const server = await loader.initServer()
      await expect(server.listen('no-colon')).rejects.toThrow(/invalid listen address/)
      server.forceShutdown()
    })

    test('rejects an address string with an empty port', async () => {
      const loader = new ProtoLoader(protoFile)
      await loader.init()
      const server = await loader.initServer()
      await expect(server.listen('127.0.0.1:')).rejects.toThrow(/invalid listen address/)
      server.forceShutdown()
    })
  })

  describe('shutdown / forceShutdown', () => {
    test('shutdown() returns immediately when already shut down', async () => {
      const loader = new ProtoLoader(protoFile)
      await loader.init()
      const server = await loader.initServer()
      server.forceShutdown()
      await expect(server.shutdown()).resolves.toBeUndefined()
    })

    test('forceShutdown() is idempotent', async () => {
      const loader = new ProtoLoader(protoFile)
      await loader.init()
      const server = await loader.initServer()
      server.forceShutdown()
      expect(() => server.forceShutdown()).not.toThrow()
    })
  })
})
