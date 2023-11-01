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
    call.on('data', (chunk) => {
      console.log(chunk.message)
    })
    call.on('end', (chunk) => {
      callback(null, { message: "Hello! I'm fine, thank you!" })
    })
  }

  serverStreamHello (call) {
    console.log(call.request.message)
    call.write({ message: 'Hello! I got you message.' })
    call.write({ message: "I'm fine, thank you" })
    call.end()
  }

  mutualStreamHello (call) {
    call.on('data', (chunk) => {
      console.log(chunk.message)
      if (chunk.message === 'Hello!') {
        call.write({ message: 'Hello!' })
      } else if (chunk.message === 'How are you?') {
        call.write({ message: "I'm fine, thank you" })
      } else {
        call.write({ message: 'pardon?' })
      }
    })
    call.on('end', (chunk) => {
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
