import path from 'node:path'
import net from 'node:net'
import { ProtoLoader } from '../src'
import type { ServerReadableStream, ServerWritableStream, ServerDuplexStream } from '../src'

const protoDir = path.join(__dirname, '../example/proto')

const loaderOptions = {
  location: protoDir,
  files: ['complex/inventory/service.proto', 'complex/orders/service.proto']
}

const pickPort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      if (typeof addr === 'object' && addr) {
        const port = addr.port
        srv.close(() => resolve(port))
      } else {
        srv.close()
        reject(new Error('Unable to pick a free port'))
      }
    })
  })

const sampleItem = (overrides: Record<string, any> = {}) => ({
  id: 'item-1',
  name: 'Notebook',
  category: 'CATEGORY_BOOK',
  status: 'STATUS_ACTIVE',
  tags: ['stationery', 'paper'],
  variants: [
    {
      sku: 'NB-A5',
      price: { currency: 'USD', units: '12', nanos: 500_000_000 },
      stock: 42
    },
    {
      sku: 'NB-A4',
      price: { currency: 'USD', units: '15', nanos: 0 },
      stock: 7
    }
  ],
  region_prices: { US: 12.5, EU: 11.8 },
  payload: Buffer.from('hello-bytes', 'utf8'),
  featured: true,
  created_at: { seconds: '1700000000', nanos: 123_000_000 },
  weight_kg: 0.42,
  ...overrides
})

class InventoryServer {
  async updateItem(call: any) {
    // Echo incoming metadata so client-side trailers can be asserted on.
    call.sendMetadata(call.metadata.clone())
    const req = call.request
    let applied: string
    let item: any
    if (req.rename !== undefined && req.change === 'rename') {
      applied = 'rename'
      item = sampleItem({ id: req.id, name: req.rename })
    } else if (req.recategorize !== undefined && req.change === 'recategorize') {
      applied = 'recategorize'
      item = sampleItem({ id: req.id, category: req.recategorize })
    } else if (req.replace !== undefined && req.change === 'replace') {
      applied = 'replace'
      item = req.replace
    } else {
      applied = 'none'
      item = sampleItem({ id: req.id })
    }
    return { item, applied }
  }

  async bulkInsert(call: ServerReadableStream) {
    const ids: string[] = []
    for await (const item of call.readAll()) {
      ids.push(item.id)
    }
    return { inserted: ids.length, ids }
  }

  async listItems(call: ServerWritableStream) {
    const req = call.request
    const cap = Number(req.limit) || 3
    for (let i = 0; i < cap; i++) {
      call.write(sampleItem({ id: `item-${i}`, category: req.category || 'CATEGORY_UNSPECIFIED' }))
    }
    call.end()
  }

  async sync(call: ServerDuplexStream) {
    for await (const event of call.readAll()) {
      if (event.kind === 'upsert') {
        call.write({ upsert: event.upsert, kind: 'upsert' })
      } else {
        call.write({ delete_id: event.delete_id, kind: 'delete_id' })
      }
    }
    call.end()
  }
}

class OrderServer {
  async createOrder(call: any) {
    const order = call.request.order
    return {
      order_id: order.id,
      status: order.status
    }
  }
}

describe('complex proto integration', () => {
  describe('loader', () => {
    test('loads multi-file, multi-package services and types', async () => {
      const loader = new ProtoLoader(loaderOptions)
      await loader.init()
      expect(loader.service('complex.inventory.InventoryService')).toBeDefined()
      expect(loader.service('complex.orders.OrderService')).toBeDefined()
      expect(loader.type('complex.common.Money')).toBeDefined()
      expect(loader.type('complex.inventory.Item')).toBeDefined()
      expect(loader.type('complex.orders.Order')).toBeDefined()
    })

    test('rejects an unknown fully-qualified name', async () => {
      const loader = new ProtoLoader(loaderOptions)
      await loader.init()
      expect(() => loader.service('complex.unknown.Service')).toThrow(/Cannot find service/)
      expect(() => loader.type('complex.unknown.Thing')).toThrow(/Cannot find type/)
    })
  })

  describe('isDev + packagePrefix', () => {
    test('exposes services under the prefixed name', async () => {
      const loader = new ProtoLoader(loaderOptions)
      await loader.init({ isDev: true, packagePrefix: 'tenantA' })
      expect(loader.service('complex.inventory.InventoryService')).toBeDefined()
      const port = await pickPort()
      const addr = { host: '127.0.0.1', port }
      const server = await loader.initServer()
      server.add('complex.inventory.InventoryService', new InventoryServer())
      await server.listen(addr)

      const clients = await loader.initClients({ services: { 'complex.inventory.InventoryService': addr } })
      const client = clients.get('complex.inventory.InventoryService')
      const { response, metadata } = await client.updateItem({ id: 'pfx-1', rename: 'after-prefix' })
      expect(response.applied).toBe('rename')
      expect(response.item.name).toBe('after-prefix')
      expect(metadata.get('x-service-path')[0]).toBe('/tenantA.complex.inventory.InventoryService/UpdateItem')

      await server.shutdown()
    })
  })

  describe('unary with rich payload and oneof branches', () => {
    test('round-trips int64/double/bool/bytes/enum/timestamp/repeated/map/nested', async () => {
      const loader = new ProtoLoader(loaderOptions)
      await loader.init()
      const port = await pickPort()
      const addr = { host: '127.0.0.1', port }
      const server = await loader.initServer()
      server.add('complex.inventory.InventoryService', new InventoryServer())
      await server.listen(addr)

      const clients = await loader.initClients({ services: { 'complex.inventory.InventoryService': addr } })
      const client = clients.get('complex.inventory.InventoryService')

      const item = sampleItem({ id: 'rich-1', name: 'Replaced' })
      const { response } = await client.updateItem({ id: 'rich-1', replace: item })
      expect(response.applied).toBe('replace')

      const got = response.item
      expect(got.id).toBe('rich-1')
      expect(got.name).toBe('Replaced')
      // enums serialized as strings (defaultLoadOptions.enums = String)
      expect(got.category).toBe('CATEGORY_BOOK')
      expect(got.status).toBe('STATUS_ACTIVE')
      // repeated string
      expect(got.tags).toEqual(['stationery', 'paper'])
      // repeated nested message
      expect(got.variants).toHaveLength(2)
      expect(got.variants[0].sku).toBe('NB-A5')
      // int64 serialized as string (defaultLoadOptions.longs = String)
      expect(got.variants[0].price.units).toBe('12')
      expect(got.variants[0].price.nanos).toBe(500000000)
      // map<string, double>
      expect(got.region_prices.US).toBeCloseTo(12.5)
      expect(got.region_prices.EU).toBeCloseTo(11.8)
      // bytes round-trips as Buffer
      expect(Buffer.isBuffer(got.payload)).toBe(true)
      expect(got.payload.toString('utf8')).toBe('hello-bytes')
      // bool
      expect(got.featured).toBe(true)
      // well-known Timestamp
      expect(got.created_at.seconds).toBe('1700000000')
      expect(got.created_at.nanos).toBe(123000000)
      // double
      expect(got.weight_kg).toBeCloseTo(0.42)

      await server.shutdown()
    })

    test('oneof sets `change` discriminator and exposes the active branch only', async () => {
      const loader = new ProtoLoader(loaderOptions)
      await loader.init()
      const port = await pickPort()
      const addr = { host: '127.0.0.1', port }
      const server = await loader.initServer()
      server.add('complex.inventory.InventoryService', new InventoryServer())
      await server.listen(addr)

      const clients = await loader.initClients({ services: { 'complex.inventory.InventoryService': addr } })
      const client = clients.get('complex.inventory.InventoryService')

      const renamed = await client.updateItem({ id: 'oo-1', rename: 'Renamed' })
      expect(renamed.response.applied).toBe('rename')
      expect(renamed.response.item.name).toBe('Renamed')

      const recat = await client.updateItem({ id: 'oo-2', recategorize: 'CATEGORY_FOOD' })
      expect(recat.response.applied).toBe('recategorize')
      expect(recat.response.item.category).toBe('CATEGORY_FOOD')

      await server.shutdown()
    })
  })

  describe('client streaming with rich payload', () => {
    test('aggregates streamed Items and returns ids', async () => {
      const loader = new ProtoLoader(loaderOptions)
      await loader.init()
      const port = await pickPort()
      const addr = { host: '127.0.0.1', port }
      const server = await loader.initServer()
      server.add('complex.inventory.InventoryService', new InventoryServer())
      await server.listen(addr)

      const clients = await loader.initClients({ services: { 'complex.inventory.InventoryService': addr } })
      const client = clients.get('complex.inventory.InventoryService')

      const call = await client.bulkInsert()
      call.writeAll([sampleItem({ id: 'b-1' }), sampleItem({ id: 'b-2' })])
      call.write(sampleItem({ id: 'b-3' }))
      const { response } = await call.writeEnd()
      expect(response.inserted).toBe(3)
      expect(response.ids).toEqual(['b-1', 'b-2', 'b-3'])

      await server.shutdown()
    })
  })

  describe('server streaming with enum filter', () => {
    test('streams Items with the requested category echoed back', async () => {
      const loader = new ProtoLoader(loaderOptions)
      await loader.init()
      const port = await pickPort()
      const addr = { host: '127.0.0.1', port }
      const server = await loader.initServer()
      server.add('complex.inventory.InventoryService', new InventoryServer())
      await server.listen(addr)

      const clients = await loader.initClients({ services: { 'complex.inventory.InventoryService': addr } })
      const client = clients.get('complex.inventory.InventoryService')

      const call = await client.listItems({ category: 'CATEGORY_FOOD', limit: 2 })
      const items: any[] = []
      for await (const item of call.readAll()) {
        items.push(item)
      }
      expect(items).toHaveLength(2)
      for (const item of items) {
        expect(item.category).toBe('CATEGORY_FOOD')
      }

      await server.shutdown()
    })
  })

  describe('bidi streaming with oneof events', () => {
    test('echoes upsert and delete branches preserving the active oneof', async () => {
      const loader = new ProtoLoader(loaderOptions)
      await loader.init()
      const port = await pickPort()
      const addr = { host: '127.0.0.1', port }
      const server = await loader.initServer()
      server.add('complex.inventory.InventoryService', new InventoryServer())
      await server.listen(addr)

      const clients = await loader.initClients({ services: { 'complex.inventory.InventoryService': addr } })
      const client = clients.get('complex.inventory.InventoryService')

      const call = await client.sync()
      call.write({ upsert: sampleItem({ id: 'up-1' }) })
      call.write({ delete_id: 'rm-1' })
      call.writeEnd()

      const events: any[] = []
      for await (const ev of call.readAll()) {
        events.push(ev)
      }
      expect(events).toHaveLength(2)
      expect(events[0].kind).toBe('upsert')
      expect(events[0].upsert.id).toBe('up-1')
      expect(events[1].kind).toBe('delete_id')
      expect(events[1].delete_id).toBe('rm-1')

      await server.shutdown()
    })
  })

  describe('multi-service registration on one server', () => {
    test('serves InventoryService and OrderService in the same process', async () => {
      const loader = new ProtoLoader(loaderOptions)
      await loader.init()
      const port = await pickPort()
      const addr = { host: '127.0.0.1', port }
      const server = await loader.initServer()
      server.add('complex.inventory.InventoryService', new InventoryServer())
      server.add('complex.orders.OrderService', new OrderServer())
      await server.listen(addr)

      const clients = await loader.initClients({
        services: {
          'complex.inventory.InventoryService': addr,
          'complex.orders.OrderService': addr
        }
      })

      const inv = clients.get('complex.inventory.InventoryService')
      const ord = clients.get('complex.orders.OrderService')

      const updated = await inv.updateItem({ id: 'm-1', rename: 'multi' })
      expect(updated.response.applied).toBe('rename')

      const created = await ord.createOrder({
        order: {
          id: '99',
          status: 'STATUS_ACTIVE',
          lines: [{ item_id: 'm-1', quantity: 2, unit_price: { currency: 'USD', units: '5', nanos: 0 } }],
          total: { currency: 'USD', units: '10', nanos: 0 },
          credit_card_last4: '4242'
        }
      })
      expect(created.response.order_id).toBe('99')
      expect(created.response.status).toBe('STATUS_ACTIVE')

      await server.shutdown()
    })
  })

  describe('sparse messages', () => {
    test('omits unset repeated/map fields when defaults=false', async () => {
      const loader = new ProtoLoader(loaderOptions)
      await loader.init()
      const port = await pickPort()
      const addr = { host: '127.0.0.1', port }
      const server = await loader.initServer()
      server.add('complex.inventory.InventoryService', new InventoryServer())
      await server.listen(addr)

      const clients = await loader.initClients({ services: { 'complex.inventory.InventoryService': addr } })
      const client = clients.get('complex.inventory.InventoryService')

      // Server does not populate variants/tags/region_prices for `rename` branch path that uses sampleItem with all set.
      // Use replace branch with a minimal Item to verify sparse handling.
      const minimalItem = { id: 'sparse-1', name: 'Sparse' }
      const { response } = await client.updateItem({ id: 'sparse-1', replace: minimalItem })
      const got = response.item
      expect(got.id).toBe('sparse-1')
      expect(got.name).toBe('Sparse')
      // unset enum is not delivered as a default string; defaults=false means undefined / omitted
      expect(got.category === undefined || got.category === '').toBe(true)
      expect(got.tags === undefined || got.tags.length === 0).toBe(true)

      await server.shutdown()
    })
  })
})
