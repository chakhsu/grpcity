import { loader } from './loader.js'

const start = async (addr: string) => {
  await loader.init()

  const clients = await loader.initClients({
    services: { 'helloworld.Greeter': addr }
  })

  const client = clients.get('helloworld.Greeter')
  const { response } = await client.sayGreet({ name: 'TypeScript' })
  console.log('sayGreet ←', response)
}

start('127.0.0.1:9103')
