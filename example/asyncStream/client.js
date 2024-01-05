import { loader } from './loader.js'

const start = async (addr) => {
  await loader.init({
    isDev: true,
    packagePrefix: 'dev'
  })

  const clients = await loader.initClients({
    services: {
      'stream.Hellor': addr
    }
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
    console.log(ctx.path, ctx.res.response, endTime - beginTime)
  }

  clients.use(logMiddleware)

  const client = clients.get('stream.Hellor')

  // client to server
  await client.unaryHello({ message: 'gRPCity' }, meta)

  // stream client to server
  // const clientStreamHelloCall = await client.clientStreamHello(meta)
  // clientStreamHelloCall.write({ message: 'Hello!' })
  // clientStreamHelloCall.write({ message: 'How are you?' })
  // await clientStreamHelloCall.writeEnd()

  // client to stream server
  // const serverStreamHelloCall = await client.serverStreamHello({ message: 'Hello! How are you?' }, meta)
  // const serverReadAllResult = serverStreamHelloCall.readAll()
  // for await (const data of serverReadAllResult) {
  //   console.log(data)
  // }
  // const serverReadEndResult = await serverStreamHelloCall.readEnd()
  // console.log(serverReadEndResult)

  // stream client to stream server
  const mutualStreamHelloCall = await client.mutualStreamHello(meta)
  mutualStreamHelloCall.writeAll([{ message: 'Hello!' }, { message: 'How are you?' }, { message: 'other thing x' }])
  mutualStreamHelloCall.write({ message: 'maybe' })

  const mutualReadAllResult = mutualStreamHelloCall.readAll()
  for await (const data of mutualReadAllResult) {
    if (data.message === 'delay 1s') {
      mutualStreamHelloCall.write({ message: 'ok, I known you delay 1s' })
      mutualStreamHelloCall.writeEnd()
    }
    console.log(data)
  }

  const mutualReadEndResult = await mutualStreamHelloCall.readEnd()
  console.log(mutualReadEndResult)
}

start('localhost:9097')
