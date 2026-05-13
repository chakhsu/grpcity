import { loader } from './loader.js'

const start = async (addr) => {
  await loader.init()

  const clients = await loader.initClients({
    services: {
      'helloworld.Greeter': addr,
      'stream.Hellor': addr
    }
  })

  const greeter = clients.get('helloworld.Greeter')
  const hellor = clients.get('stream.Hellor')

  const a = await greeter.sayGreet({ name: 'gRPCity' })
  console.log('Greeter.sayGreet ←', a.response)

  const b = await hellor.unaryHello({ message: 'gRPCity' })
  console.log('Hellor.unaryHello ←', b.response)
}

start('127.0.0.1:9100')
