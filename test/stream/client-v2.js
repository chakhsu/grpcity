const GrpcLoader = require('../../index.js')
const path = require('path')

const start = async (addr) => {
  const loader = new GrpcLoader({
    location: path.resolve(__dirname, './'),
    files: ['stream.proto']
  })
  await loader.init({
    isDev: true,
    packagePrefix: 'dev'
  })

  await loader.initClients({
    services: {
      'stream.Hellor': addr
    }
  })

  const client = loader.client('stream.Hellor')

  const meta = loader.makeMetadata({
    'x-cache-control': 'max-age=100',
    'x-business-id': ['grpcity', 'testing'],
    'x-timestamp-client': 'begin=' + new Date().toISOString()
  })

  // stream client to server
  const clientStreamHelloCall = client.clientStreamHello(meta)
  clientStreamHelloCall.write({ message: 'Hello!' })
  clientStreamHelloCall.write({ message: 'How are you?' })
  const writeResult = await clientStreamHelloCall.writeEnd()
  console.log(writeResult.response)

  // // client to stream server
  const serverStreamHelloCall = client.serverStreamHello({ message: 'Hello! How are you?' }, meta)
  const serverReadAllResult = await serverStreamHelloCall.readAll()
  for await (const data of serverReadAllResult) {
    console.log(data)
  }
  const serverReadEndResult = serverStreamHelloCall.readEnd()
  console.log(serverReadEndResult)

  // stream client to stream server
  const mutualStreamHelloCall = client.mutualStreamHello(meta)
  mutualStreamHelloCall.writeAll([
    { message: 'Hello!' },
    { message: 'How are you?' },
    { message: 'other thing x' }
  ])
  mutualStreamHelloCall.write({ message: 'maybe' })

  const mutualReadAllResult = mutualStreamHelloCall.readAll()
  for await (const data of mutualReadAllResult) {
    console.log(data)
  }

  const mutualReadEndResult = mutualStreamHelloCall.readEnd()
  console.log(mutualReadEndResult)
}

start('localhost:9097')
