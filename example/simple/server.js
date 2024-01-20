import { loader } from './loader.js'

const start = async (addr) => {
  await loader.init()
  const server = await loader.initServer()

  const implementation = {
    sayHello: async (call) => {
      return { message: `I got your message: ${call.request.message}` }
    }
  }

  server.add('simple.Hellor', implementation)
  await server.listen(addr)
  console.log('start:', addr)
}

start('localhost:5051')
