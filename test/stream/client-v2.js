const GrpcLoader = require('../../index.js')
const path = require('path')

async function start (addr) {
  const loader = new GrpcLoader({
    location: path.resolve(__dirname, './'),
    files: ['stream.proto']
  })
  await loader.init()

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
  const clientStreamHelloCall = client.stream.clientStreamHello(meta)
  clientStreamHelloCall.write({ message: 'Hello!' })
  clientStreamHelloCall.write({ message: 'How are you?' })
  const writeResult = await clientStreamHelloCall.writeEnd()
  console.log(writeResult.response)

  // client to stream server
  const serverStreamHelloCall = client.stream.serverStreamHello({ message: 'Hello! How are you?' }, meta)
  const serverReadResult = await serverStreamHelloCall.readAll()
  for await (const data of serverReadResult.response) {
    console.log(data)
  }

  // stream client to stream server
  const mutualStreamHelloCall = client.stream.mutualStreamHello(meta)
  mutualStreamHelloCall.writeAll([
    { message: 'Hello!' },
    { message: 'How are you?' },
    { message: 'other thing x' }
  ])
  const mutualReadAllResult = await mutualStreamHelloCall.readAll()
  for await (const data of mutualReadAllResult.response) {
    console.log(data)
  }
}

start('localhost:9097')