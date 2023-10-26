const GrpcLoader = require('..')
const path = require('path')

async function start (addr) {
  const loader = new GrpcLoader({
    location: path.resolve(__dirname, 'protos'),
    files: ['test/helloworld/helloworld.proto']
  })
  await loader.init()

  await loader.initClients({
    services: {
      'test.helloworld.Greeter': addr,
      'test.helloworld.Hellor': addr
    }
  })

  // greeterClient
  const greeterClient = loader.client('test.helloworld.Greeter')
  const result = await greeterClient.sayHello({ name: 'greeter' })
  console.log('greeterClient.sayHello', result)

  // hellorClient
  const hellorClient = loader.client('test.helloworld.Hellor')
  const result2 = await hellorClient.sayHello({ name: 'hellor2' })
  console.log('hellorClient.sayHello', result2)

  const result3 = await hellorClient.sayHello({ name: 'hellor3' })
  console.log('hellorClient.sayHello', result3)
}

start('127.0.0.1:9099')
