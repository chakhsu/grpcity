import { asyncStreamLoader as loader } from './loader.js'

function timeout(ms) {
  return new Promise((resolve, reject) => setTimeout(resolve, ms))
}

class Stream {
  async unaryHello(call) {
    return { message: 'hello ' + call.request.message }
  }

  async clientStreamHello(call) {
    const metadata = call.metadata.clone()
    metadata.add('x-timestamp-server', 'received=' + new Date().toISOString())
    call.sendMetadata(metadata)

    for await (const data of call.readAll()) {
      console.log(data)
    }
    return { message: "Hello! I'm fine, thank you!" }
  }

  async serverStreamHello(call) {
    const metadata = call.metadata.clone()
    metadata.add('x-timestamp-server', 'received=' + new Date().toISOString())
    call.sendMetadata(metadata)

    console.log(call.request.message)
    call.write({ message: 'Hello! I got you message.' })
    call.write({ message: "I'm fine, thank you" })
    call.writeAll([{ message: 'other thing x' }, { message: 'other thing y' }])
    call.end()
  }

  async mutualStreamHello(call) {
    const metadata = call.metadata.clone()
    metadata.add('x-timestamp-server', 'received=' + new Date().toISOString())
    call.sendMetadata(metadata)

    call.write({ message: 'emmm...' })

    for await (const data of call.readAll()) {
      console.log(data.message)
      if (data.message === 'Hello!') {
        call.write({ message: 'Hello too.' })
      } else if (data.message === 'How are you?') {
        call.write({ message: "I'm fine, thank you" })
        await timeout(1000)
        call.write({ message: 'delay 1s' })
        call.writeAll([{ message: 'emm... ' }, { message: 'emm......' }])
      } else {
        call.write({ message: 'pardon?' })
      }
    }

    call.end()
  }
}

const start = async (addr) => {
  await loader.init({
    isDev: true,
    packagePrefix: 'test'
  })
  const reflection = await loader.initReflection()

  const server = await loader.initServer()

  server.add('stream.Hellor', new Stream())

  server.inject(reflection)

  await server.listen(addr)
  console.log('start:', addr)
}

start('localhost:9097')
