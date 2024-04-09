import { loader } from './loader.js'

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

  const clients = await loader.initClients({
    services: {
      'helloworld.Greeter': addr
    }
  })

  // greeterClient
  const greeterClient = clients.get('helloworld.Greeter')

  const ac = new AbortController()
  const { signal } = ac
  setTimeout(() => {
    console.log('abort signal')
    ac.abort()
  }, 1000)

  try {
    const result = await greeterClient.sayGreet({ name: 'greeter' }, meta, { signal })
    console.log(result)
  } catch (error) {
    console.log(error.code)
    console.log(error.name)
    console.log(error.message)
  }

  const { status, metadata, response: result } = await greeterClient.sayGreet({ name: 'greeter' }, meta)
  console.log('greeterClient.sayGreet', result)
  console.log('greeterClient.sayGreet metadata', metadata)
  console.log('greeterClient.sayGreet status', status)
}

start('localhost:9099')
