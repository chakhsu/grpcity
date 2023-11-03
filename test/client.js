const GrpcLoader = require('..')
const path = require('path')
const fs = require('fs')

const start = async (addr) => {
  const loader = new GrpcLoader({
    location: path.resolve(__dirname, 'protos'),
    files: ['test/helloworld/helloworld.proto']
  })
  await loader.init()

  const credentials = loader.makeCredentials(
    fs.readFileSync(path.resolve(__dirname, 'certs/ca.crt')),
    fs.readFileSync(path.resolve(__dirname, 'certs/client.key')),
    fs.readFileSync(path.resolve(__dirname, 'certs/client.crt'))
  )

  await loader.initClients({
    services: {
      'test.helloworld.Greeter': addr,
      'test.helloworld.Hellor': addr
    },
    credentials
  })

  const meta = loader.makeMetadata({
    'x-cache-control': 'max-age=100',
    'x-business-id': ['grpcity', 'testing'],
    'x-timestamp-client': 'begin=' + new Date().toISOString()
  })

  // greeterClient
  const greeterClient = loader.client('test.helloworld.Greeter', { credentials })
  const { status, metadata, response: result } = await greeterClient.sayHello({ name: 'greeter' }, meta)
  console.log('greeterClient.sayHello', result)
  console.log('greeterClient.sayHello metadata', metadata)
  console.log('greeterClient.sayHello status', status)

  // hellorClient
  const hellorClient = loader.client('test.helloworld.Hellor')
  const { response: result2 } = await hellorClient.sayHello({ name: 'hellor2' })
  console.log('hellorClient.sayHello', result2)

  const { response: result3 } = await hellorClient.sayHello({ name: 'hellor3' })
  console.log('hellorClient.sayHello', result3)
}

start('localhost:9099')
