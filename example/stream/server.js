import { loader } from './loader.js'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

class Hellor {
  async unaryHello(call) {
    return { message: `hello, ${call.request.message}` }
  }

  async clientStreamHello(call) {
    const echo = call.metadata.clone()
    echo.add('x-timestamp-server', `received=${new Date().toISOString()}`)
    call.sendMetadata(echo)

    const messages = []
    for await (const data of call.readAll()) {
      messages.push(data.message)
    }
    return { message: `received ${messages.length} message(s): ${messages.join(', ')}` }
  }

  async serverStreamHello(call) {
    const echo = call.metadata.clone()
    echo.add('x-timestamp-server', `received=${new Date().toISOString()}`)
    call.sendMetadata(echo)

    call.write({ message: `hello, ${call.request.message}` })
    call.writeAll([{ message: 'how are you?' }, { message: 'have a nice day' }])
    call.end()
  }

  async mutualStreamHello(call) {
    const echo = call.metadata.clone()
    echo.add('x-timestamp-server', `received=${new Date().toISOString()}`)
    call.sendMetadata(echo)

    for await (const data of call.readAll()) {
      if (data.message === 'How are you?') {
        call.write({ message: "I'm fine, thank you" })
        await delay(200)
        call.write({ message: 'delay 200ms' })
      } else {
        call.write({ message: `echo: ${data.message}` })
      }
    }
    call.end()
  }
}

const start = async (addr) => {
  await loader.init()

  const server = await loader.initServer()
  server.add('stream.Hellor', new Hellor())

  await server.listen(addr)
  console.log('gRPC server listening on', addr)
}

start('127.0.0.1:9097')
