import { loader } from './loader.js'

const start = async (addr) => {
  await loader.init()
  const clients = await loader.initClients({ services: { 'simple.Hellor': addr } })

  const client = clients.get('simple.Hellor')
  const { response } = await client.sayHello({ message: 'grpcity' })
  console.log(response)
}

start('localhost:5051')
