import { loader } from './loader.js'

const printErr = (label, err) => {
  // GrpcClientError carries the gRPC status code, details, and the
  // outbound metadata used by the call. Use these instead of err.message
  // when you need to branch on outcome.
  console.log(`${label}:`)
  console.log('  name   :', err.name)
  console.log('  code   :', err.code)
  console.log('  details:', err.details)
  console.log('  message:', err.message)
}

const start = async (addr) => {
  await loader.init()

  const clients = await loader.initClients({
    services: { 'helloworld.Greeter': addr }
  })

  // 1. Plain server-side throw → propagated to the client.
  try {
    const c = clients.get('helloworld.Greeter')
    await c.sayGreet({ name: 'throw' })
  } catch (err) {
    printErr('server-side throw', err)
  }

  // 2. Deadline timeout — server sleeps 2s, deadline is 100ms.
  try {
    const c = clients.get('helloworld.Greeter', { timeout: 100 })
    await c.sayGreet({ name: 'slow' })
  } catch (err) {
    printErr('deadline exceeded', err)
  }

  // 3. Happy path still works.
  const c = clients.get('helloworld.Greeter')
  const ok = await c.sayGreet({ name: 'gRPCity' })
  console.log('happy path  ←', ok.response)
}

start('127.0.0.1:9102')
