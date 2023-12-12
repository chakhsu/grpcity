const GrpcLoader = require('../../lib')
const path = require('path')

class Stream {
  constructor() {
    this.count = 0
  }

  unaryHello(call, callback) {
    console.log(call.request.message)
    callback(null, { message: 'hello ' + call.request.message })
  }

  clientStreamHello(call, callback) {
    const metadata = call.metadata.clone()
    metadata.add('x-timestamp-server', 'received=' + new Date().toISOString())
    call.sendMetadata(metadata)

    call.on('data', (data) => {
      console.log(data)
    })
    call.on('end', () => {
      callback(null, { message: "Hello! I'm fine, thank you!" })
    })
  }

  serverStreamHello(call) {
    const metadata = call.metadata.clone()
    metadata.add('x-timestamp-server', 'received=' + new Date().toISOString())
    call.sendMetadata(metadata)

    console.log(call.request.message)
    call.write({ message: 'Hello! I got you message.' })
    call.write({ message: "I'm fine, thank you" })
    call.end()
  }

  mutualStreamHello(call) {
    const metadata = call.metadata.clone()
    metadata.add('x-timestamp-server', 'received=' + new Date().toISOString())
    call.sendMetadata(metadata)

    call.write({ message: 'emmm...' })
    call.on('data', (chunk) => {
      console.log(chunk.message)
      if (chunk.message === 'Hello!') {
        call.write({ message: 'Hello too.' })
      } else if (chunk.message === 'How are you?') {
        call.write({ message: "I'm fine, thank you" })
        setTimeout(() => {
          call.write({ message: 'delay 1s' })
        }, 1000)
      } else {
        call.write({ message: 'pardon?' })
      }
    })
    call.on('end', () => {
      setTimeout(() => {
        console.log('client call end.')
        call.end()
      }, 3000)
    })
  }
}

const start = async (addr) => {
  const loader = new GrpcLoader({
    location: path.resolve(__dirname, './'),
    files: ['stream.proto']
  })
  await loader.init({
    isDev: true,
    packagePrefix: 'dev'
  })

  const server = loader.initServer()
  server.addService('stream.Hellor', new Stream())

  await server.listen(addr)
  console.log('start:', addr)
}

start('localhost:9097')
