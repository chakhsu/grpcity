import { loader, clientCredentials as credentials } from './loader.js'

const start = async (addr) => {
  await loader.init({
    isDev: true,
    packagePrefix: 'dev'
  })

  const meta = loader.makeMetadata({
    'x-cache-control': 'max-age=100',
    'x-business-id': ['grpcity', 'testing'],
    'x-timestamp-client': 'begin=' + new Date().toISOString()
  })

  const clients = await loader.initClients({
    services: {
      'helloworld.Greeter': addr,
      'helloworld.Hellor': addr
    },
    credentials
  })

  // greeterClient
  const greeterClient = clients.get('helloworld.Greeter', {
    credentials
  })
  const { status, metadata, response: result } = await greeterClient.sayGreet({ name: 'greeter' }, meta)
  console.log('greeterClient.sayGreet', result)
  console.log('greeterClient.sayGreet metadata', metadata)
  console.log('greeterClient.sayGreet status', status)

  // hellorClient
  const hellorClient = clients.get('helloworld.Hellor')
  const { response: result1 } = await hellorClient.sayHello({ name: 'hellor1' })
  console.log('hellorClient.sayHello', result1)

  const { response: result2 } = await hellorClient.sayHello({ name: 'hellor2' })
  console.log('hellorClient.sayHello', result2)

  // initClients again
  const twiceClients = await loader.initClients({
    services: {
      'helloworld.Hellor': addr
    },
    credentials
  })
  const newHellorClient = twiceClients.get('helloworld.Hellor')
  const { response: result3 } = await newHellorClient.sayHello({ name: 'hellor3' })
  console.log('newHellorClient.sayHello', result3)

  // origin client
  const twiceHellorClient = clients.get('helloworld.Hellor')
  const { response: result4 } = await twiceHellorClient.sayHello({
    name: 'hellor4'
  })
  console.log('hellorClient.sayHello', result4)
}

start('localhost:9099')
