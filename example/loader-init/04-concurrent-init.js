// 04-concurrent-init.js — init() is concurrent-safe.
//
// What it shows:
//  - If two pieces of code call loader.init() before the proto files have
//    finished loading, they share the same in-flight Promise instead of
//    triggering a second load.
//  - Once init has resolved, further init() calls return immediately.
//  - This means you can safely sprinkle `await loader.init()` at the top of
//    every entry point (server.js, client.js, a worker) without worrying
//    about race conditions or wasted work.

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ProtoLoader } from 'grpcity'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const loader = new ProtoLoader({
  location: path.join(__dirname, '../proto'),
  files: ['helloworld/service.proto']
})

const start = async () => {
  // Fire five init() calls before any of them has had a chance to resolve.
  // grpcity collapses them onto one Promise; the proto files are read once.
  const before = process.hrtime.bigint()
  await Promise.all([loader.init(), loader.init(), loader.init(), loader.init(), loader.init()])
  const elapsed = Number(process.hrtime.bigint() - before) / 1e6
  console.log(`five concurrent init() calls resolved in ${elapsed.toFixed(1)}ms`)

  // A later init() — after init has already settled — is a cheap no-op.
  const t2 = process.hrtime.bigint()
  await loader.init()
  console.log(`post-init init() resolved in ${(Number(process.hrtime.bigint() - t2) / 1e6).toFixed(2)}ms`)

  // The loader is fully usable.
  console.log('service:', loader.service('helloworld.Greeter') ? 'found' : 'missing')
}

start()
