const { ProtoLoader } = require('../lib')
const path = require('path')

const implementation = {
  sayHello: async (call) => {
    return { message: 'Hello ' + call.request.name }
  }
}

const start = async (addr) => {
  const loader = new ProtoLoader({
    location: path.resolve(__dirname, './'),
    files: ['helloworld.proto']
  })
  await loader.init()

  const server = await loader.initServer()
  server.add('helloworld.Greeter', implementation)
  await server.listen(addr)
  console.log('start:', addr)
}

start('0.0.0.0:9099')
