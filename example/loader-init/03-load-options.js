// 03-load-options.js — overriding loadOptions.
//
// loadOptions is passed straight through to @grpc/proto-loader.
// See: https://www.npmjs.com/package/@grpc/proto-loader#options
//
// Defaults baked into grpcity (src/config/defaultLoadOptions.ts):
//   keepCase: true     — preserve field casing from the .proto file
//                        (so `region_prices` stays `region_prices`, not
//                        `regionPrices`).
//   longs:    String   — int64 / uint64 / sint64 arrive as decimal strings,
//                        sidestepping JavaScript's 53-bit integer limit.
//   enums:    String   — enums arrive as their symbol names ("CATEGORY_BOOK"),
//                        not numeric values.
//   defaults: false    — unset fields are absent on the message (no zero
//                        values, empty arrays, or empty strings are filled
//                        in by the loader).
//   oneofs:   true     — populate a discriminator field telling you which
//                        oneof branch was set.
//
// What it shows:
//  - You can override any of these by passing your own loadOptions object;
//    grpcity forwards it verbatim.
//  - Below we flip three knobs and observe the difference on the wire:
//    keepCase=false → camelCased field names, enums=Number → numeric enum
//    values, defaults=true → unset scalar/repeated fields are filled in.

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ProtoLoader } from 'grpcity'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const protoFile = {
  location: path.join(__dirname, '../proto'),
  files: ['complex/inventory/service.proto']
}

class InventoryServer {
  async updateItem(call) {
    // Return an Item with a *partial* shape — region_prices and variants
    // intentionally left unset so we can see how the loader represents them.
    return {
      item: {
        id: call.request.id,
        name: 'Notebook',
        category: 'CATEGORY_BOOK', // server still sends the enum by name
        status: 'STATUS_ACTIVE'
      },
      applied: 'rename'
    }
  }
}

const runWith = async (label, loaderInitOptions) => {
  // Each demo uses its own ProtoLoader so the two configurations don't
  // collide. In production you'd typically pick one loadOptions set per
  // service and stick with it.
  const loader = new ProtoLoader(protoFile)
  await loader.init(loaderInitOptions)

  const addr = '127.0.0.1:9203'
  const server = await loader.initServer()
  server.add('complex.inventory.InventoryService', new InventoryServer())
  await server.listen(addr)

  const clients = await loader.initClients({
    services: { 'complex.inventory.InventoryService': addr }
  })
  const { response } = await clients.get('complex.inventory.InventoryService').updateItem({
    id: 'x-1',
    rename: 'Notebook'
  })

  console.log(`\n[${label}]`)
  console.log('item shape:', response.item)

  await server.shutdown()
}

const start = async () => {
  // Defaults: keepCase=true, enums=String, defaults=false (unset → absent).
  await runWith('defaults', undefined)

  // Camel case fields + numeric enums + zero-value defaults filled in.
  await runWith('camelCase + numeric enums + defaults=true', {
    loadOptions: {
      keepCase: false,
      enums: Number,
      longs: String,
      defaults: true,
      oneofs: true
    }
  })
}

start()
