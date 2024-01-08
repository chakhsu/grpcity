import { loader, clientCredentials as credentials } from './loader.js'

const start = async (addr) => {
  await loader.init({
    isDev: true,
    packagePrefix: 'test'
  })

  const meta = loader.makeMetadata({
    'x-cache-control': 'max-age=100',
    'x-business-id': ['grpcity', 'testing'],
    'x-timestamp-client': 'begin=' + new Date().toISOString()
  })

  const logMiddleware = async (ctx, next) => {
    const beginTime = new Date().getTime()
    await next()
    const endTime = new Date().getTime()
    console.log(ctx.peer, ctx.response, endTime - beginTime)
  }

  const clients = await loader.initClients({
    services: {
      'helloworld.Greeter': addr,
      'helloworld.Hellor': addr
    },
    credentials
  })

  clients.use(logMiddleware)

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
  await hellorClient.sayHello({ name: 'hellor1' })

  await hellorClient.sayHello({ name: 'hellor2' })

  // initClients again
  const twiceClients = await loader.initClients({
    services: {
      'helloworld.Hellor': addr
    },
    credentials
  })
  twiceClients.use(logMiddleware)
  const newHellorClient = twiceClients.get('helloworld.Hellor')
  await newHellorClient.sayHello({ name: 'hellor3' })

  // origin client
  const twiceHellorClient = clients.get('helloworld.Hellor')
  await twiceHellorClient.sayHello({
    name: 'hellor4'
  })
}

start('localhost:9099')
