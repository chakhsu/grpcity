import fs from 'node:fs'
import path from 'node:path'
import { loader, certsDir } from './loader.js'

class Greeter {
  async sayGreet(call) {
    return { message: `hello over mTLS, ${call.request.name || 'world'}` }
  }
}

const start = async (addr) => {
  await loader.init()

  // Mutual TLS: server requires the client to present a certificate signed
  // by the same CA. Set the third argument to false for one-way TLS.
  const credentials = loader.makeServerCredentials(
    fs.readFileSync(path.join(certsDir, 'ca.crt')),
    [
      {
        private_key: fs.readFileSync(path.join(certsDir, 'server.key')),
        cert_chain: fs.readFileSync(path.join(certsDir, 'server.crt'))
      }
    ],
    true
  )

  const server = await loader.initServer({ credentials })
  server.add('helloworld.Greeter', new Greeter())

  await server.listen(addr)
  console.log('gRPC mTLS server listening on', addr)
}

start('localhost:9443')
