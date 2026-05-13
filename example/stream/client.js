import { loader } from './loader.js'

const start = async (addr) => {
  await loader.init()

  const clients = await loader.initClients({
    services: { 'stream.Hellor': addr }
  })

  const meta = loader.makeMetadata({
    'x-cache-control': 'max-age=100',
    'x-business-id': ['grpcity', 'example'],
    'x-timestamp-client': `begin=${new Date().toISOString()}`
  })

  const client = clients.get('stream.Hellor')

  // unary
  const unary = await client.unaryHello({ message: 'gRPCity' }, meta)
  console.log('unaryHello ←', unary.response)

  // client → server stream
  const clientStream = await client.clientStreamHello(meta)
  clientStream.write({ message: 'Hello!' })
  clientStream.write({ message: 'How are you?' })
  const clientStreamResult = await clientStream.writeEnd()
  console.log('clientStreamHello ←', clientStreamResult.response)

  // server → client stream
  const serverStream = await client.serverStreamHello({ message: 'gRPCity' }, meta)
  for await (const data of serverStream.readAll()) {
    console.log('serverStreamHello ←', data)
  }
  await serverStream.readEnd()

  // bidi
  const bidi = await client.mutualStreamHello(meta)
  bidi.writeAll([{ message: 'Hello!' }, { message: 'How are you?' }, { message: 'something else' }])
  bidi.writeEnd()
  for await (const data of bidi.readAll()) {
    console.log('mutualStreamHello ←', data)
  }
  await bidi.readEnd()
}

start('127.0.0.1:9097')
