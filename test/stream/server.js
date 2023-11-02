const GrpcLoader = require('../../index.js')
const path = require('path')

class Stream {
  constructor (loader) {
    this._loader = loader
    this.count = 0
  }

  async init (server) {
    server.addService(
      this._loader.service('stream.Hellor'),
      this._loader.callbackify(this, { exclude: ['init'] })
    )
  }

  clientStreamHello (call, callback) {
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

  serverStreamHello (call) {
    const metadata = call.metadata.clone()
    metadata.add('x-timestamp-server', 'received=' + new Date().toISOString())
    call.sendMetadata(metadata)

    console.log(call.request.message)
    call.write({ message: 'Hello! I got you message.' })
    call.write({ message: "I'm fine, thank you" })
    call.end()
  }

  mutualStreamHello (call) {
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
      } else {
        call.write({ message: 'pardon?' })
      }
    })
    call.on('end', () => {
      console.log('client call end.')
      call.end()
    })
  }
}

async function start (addr) {
  const loader = new GrpcLoader({
    location: path.resolve(__dirname, './'),
    files: ['stream.proto']
  })
  await loader.init()

  const server = loader.initServer()

  const servicers = [new Stream(loader)]
  await Promise.all(servicers.map(async s => s.init(server)))

  await server.listen(addr)
  console.log('start:', addr)
}

start('localhost:9097')
