const GrpcLoader = require('..')
const path = require('path')
const fs = require('fs')

async function start (addr) {
  const loader = new GrpcLoader({
    location: path.resolve(__dirname, 'protos'),
    files: ['test/helloworld/helloworld.proto']
  })
  await loader.init()

  const credentials = loader.makeCredentials(
    fs.readFileSync(__dirname + '/certs/ca.crt'),
    fs.readFileSync(__dirname + '/certs/client.key'),
    fs.readFileSync(__dirname + '/certs/client.crt')
  )

  await loader.initClients({
    services: {
      'test.helloworld.Greeter': addr,
      'test.helloworld.Hellor': addr
    },
    credentials
  })

  // greeterClient
  const greeterClient = loader.client('test.helloworld.Greeter', { credentials })
  const { response: result } = await greeterClient.sayHello({ name: 'greeter' })
  console.log('greeterClient.sayHello', result)

  // hellorClient
  const hellorClient = loader.client('test.helloworld.Hellor')
  const  { response: result2 } = await hellorClient.sayHello({ name: 'hellor2' })
  console.log('hellorClient.sayHello', result2)

  const  { response: result3 } = await hellorClient.sayHello({ name: 'hellor3' })
  console.log('hellorClient.sayHello', result3)
}

start('localhost:9099')
