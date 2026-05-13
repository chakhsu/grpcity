import {
  assertProtoFileOptionsOptions,
  attemptInitOptions,
  attemptInitClientsOptions,
  attemptInitServerOptions,
  AddressSchema
} from '../src/schema/loader'

describe('schema/loader', () => {
  describe('assertProtoFileOptionsOptions', () => {
    test('accepts a single object', () => {
      expect(() => assertProtoFileOptionsOptions({ location: '/x', files: ['a.proto'] })).not.toThrow()
    })

    test('accepts an array of objects', () => {
      expect(() => assertProtoFileOptionsOptions([{ location: '/x', files: ['a.proto'] }])).not.toThrow()
    })

    test('rejects when files is missing and prefixes the error', () => {
      let err: Error | null = null
      try {
        assertProtoFileOptionsOptions({ location: '/x' } as any)
      } catch (e) {
        err = e as Error
      }
      expect(err).not.toBeNull()
      expect(err!.message).toMatch(/^new ProtoLoader\(\) params error:/)
    })

    test('rejects non-string location', () => {
      expect(() => assertProtoFileOptionsOptions({ location: 123, files: [] } as any)).toThrow()
    })
  })

  describe('attemptInitOptions', () => {
    test('fills default loadOptions when called with undefined', () => {
      const r = attemptInitOptions(undefined)
      expect(r.loadOptions).toBeDefined()
      expect((r.loadOptions as any).keepCase).toBe(true)
    })

    test('preserves isDev and packagePrefix', () => {
      const r = attemptInitOptions({ isDev: true, packagePrefix: 'pkg' })
      expect(r.isDev).toBe(true)
      expect(r.packagePrefix).toBe('pkg')
    })

    test('passes user loadOptions through, including custom fields', () => {
      const r = attemptInitOptions({ loadOptions: { keepCase: false, customField: 1 } as any })
      expect((r.loadOptions as any).keepCase).toBe(false)
      expect((r.loadOptions as any).customField).toBe(1)
    })

    test('rejects wrong-typed isDev', () => {
      expect(() => attemptInitOptions({ isDev: 'yes' } as any)).toThrow()
    })
  })

  describe('attemptInitClientsOptions', () => {
    test('accepts services with string address', () => {
      const r = attemptInitClientsOptions({ services: { 'a.B': '127.0.0.1:9090' } } as any)
      expect(r.services['a.B']).toBe('127.0.0.1:9090')
    })

    test('accepts services with object address', () => {
      const r = attemptInitClientsOptions({ services: { 'a.B': { host: '1.2.3.4', port: 80 } } } as any)
      expect((r.services['a.B'] as any).port).toBe(80)
    })

    test('fills default channelOptions', () => {
      const r = attemptInitClientsOptions({ services: {} } as any)
      expect(r.channelOptions).toBeDefined()
      expect((r.channelOptions as any)['grpc.enable_retries']).toBe(1)
    })

    test('passes user channelOptions through, including custom fields', () => {
      const r = attemptInitClientsOptions({
        services: {},
        channelOptions: { 'grpc.x': 1, custom: true } as any
      })
      expect((r.channelOptions as any).custom).toBe(true)
      expect((r.channelOptions as any)['grpc.x']).toBe(1)
    })

    test('rejects address object with out-of-range port', () => {
      expect(() => attemptInitClientsOptions({ services: { x: { host: 'h', port: 70000 } } } as any)).toThrow()
    })

    test('rejects string address without a colon', () => {
      expect(() => attemptInitClientsOptions({ services: { x: 'no-port' } } as any)).toThrow()
    })

    test('passes credentials through unchanged', () => {
      const fake = { _: 'cred' } as any
      const r = attemptInitClientsOptions({ services: {}, credentials: fake } as any)
      expect(r.credentials).toBe(fake)
    })
  })

  describe('attemptInitServerOptions', () => {
    test('fills default channelOptions when called with undefined', () => {
      const r = attemptInitServerOptions(undefined)
      expect(r.channelOptions).toBeDefined()
      expect((r.channelOptions as any)['grpc.enable_retries']).toBe(1)
    })

    test('passes user channelOptions through', () => {
      const r = attemptInitServerOptions({ channelOptions: { custom: true } as any })
      expect((r.channelOptions as any).custom).toBe(true)
    })
  })

  describe('AddressSchema', () => {
    test('accepts a host:port string', () => {
      expect(AddressSchema.safeParse('127.0.0.1:9090').success).toBe(true)
    })

    test('rejects a string without a colon', () => {
      expect(AddressSchema.safeParse('no-colon').success).toBe(false)
    })

    test('accepts a {host, port} object', () => {
      expect(AddressSchema.safeParse({ host: 'h', port: 1 }).success).toBe(true)
    })

    test('rejects a port outside the valid range', () => {
      expect(AddressSchema.safeParse({ host: 'h', port: -1 }).success).toBe(false)
    })
  })
})
