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
  const clientStreamHelloCall = client.call.clientStreamHello(meta, (err, response) => {
    if (err) {
      console.log(err)
    } else {
      console.log(response)
    }
  })
  clientStreamHelloCall.write({ message: 'Hello!' })
  clientStreamHelloCall.write({ message: 'How are you?' })
  clientStreamHelloCall.end()

  // client to stream server
  const serverStreamHelloCall = client.call.serverStreamHello({ message: 'Hello! How are you?' })
  serverStreamHelloCall.on('data', (chunk) => {
    console.log(chunk)
  })
  serverStreamHelloCall.on('end', () => {
    console.log('server call end.')
  })

  // stream client to stream server
  const mutualStreamHelloCall = client.call.mutualStreamHello()
  mutualStreamHelloCall.write({ message: 'Hello!' })
  mutualStreamHelloCall.write({ message: 'How are you?' })
  mutualStreamHelloCall.write({ message: 'other thing x' })
  mutualStreamHelloCall.end()

  mutualStreamHelloCall.on('data', (chunk) => {
    console.log(chunk)
  })
  mutualStreamHelloCall.on('end', () => {
    console.log('server call end.')
  })
}

start('localhost:9097')
