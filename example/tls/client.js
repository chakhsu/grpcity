import fs from 'node:fs'
import path from 'node:path'
import { loader, certsDir } from './loader.js'

const start = async (addr) => {
  await loader.init()

  const credentials = loader.makeClientCredentials(
    fs.readFileSync(path.join(certsDir, 'ca.crt')),
    fs.readFileSync(path.join(certsDir, 'client.key')),
    fs.readFileSync(path.join(certsDir, 'client.crt'))
  )

  const clients = await loader.initClients({
    services: { 'helloworld.Greeter': addr },
    credentials
  })

  const client = clients.get('helloworld.Greeter')
  const { response, peer } = await client.sayGreet({ name: 'mTLS' })
  console.log('sayGreet ←', response, 'from', peer)
}

start('localhost:9443')
