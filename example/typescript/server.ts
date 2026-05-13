import { loader } from './loader.js'
// `.js` in the import even though the file is `.ts` — Node ESM rules.
// The TS types come from the .ts file because we use NodeNext resolution.

interface SayGreetRequest {
  name: string
}

interface SayGreetResponse {
  message: string
}

class Greeter {
  async sayGreet(call: { request: SayGreetRequest }): Promise<SayGreetResponse> {
    return { message: `hello, ${call.request.name || 'world'}` }
  }
}

const start = async (addr: string) => {
  await loader.init()

  const server = await loader.initServer()
  server.add('helloworld.Greeter', new Greeter())

  await server.listen(addr)
  console.log('TS gRPC server listening on', addr)
}

start('127.0.0.1:9103')
