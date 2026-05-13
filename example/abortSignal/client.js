import { loader } from './loader.js'

const printErr = (label, err) => {
  console.log(label, '— name:', err.name, 'code:', err.code, 'msg:', err.message)
}

const start = async (addr) => {
  await loader.init()

  const clients = await loader.initClients({
    services: { 'helloworld.Greeter': addr }
  })
  const client = clients.get('helloworld.Greeter')

  // 1. Pre-abort — the call short-circuits before reaching the server.
  //    The client receives an AbortError, NOT a gRPC status.
  {
    const ac = new AbortController()
    ac.abort()
    try {
      await client.sayGreet({ name: 'pre' }, null, { signal: ac.signal })
    } catch (err) {
      printErr('1) pre-abort           ', err)
    }
  }

  // 2. Timeout-driven abort via AbortSignal.timeout().
  //    The server is mid-flight, the timer fires, grpcity calls
  //    underlying call.cancel(), and the client sees gRPC CANCELLED.
  {
    const signal = AbortSignal.timeout(50)
    try {
      await client.sayGreet({ name: 'timeout' }, null, { signal })
    } catch (err) {
      printErr('2) AbortSignal.timeout ', err)
    }
  }

  // 3. One signal can fan out across multiple RPCs. Abort the controller
  //    once and every in-flight call cancels.
  {
    const ac = new AbortController()
    setTimeout(() => ac.abort(), 80)
    const calls = [
      client.sayGreet({ name: 'a' }, null, { signal: ac.signal }),
      client.sayGreet({ name: 'b' }, null, { signal: ac.signal }),
      client.sayGreet({ name: 'c' }, null, { signal: ac.signal })
    ]
    const settled = await Promise.allSettled(calls)
    settled.forEach((r, i) => {
      if (r.status === 'rejected') {
        printErr(`3) shared signal call ${'abc'[i]}`, r.reason)
      }
    })
  }

  // 4. Without a signal, the call simply succeeds.
  const { response } = await client.sayGreet({ name: 'plain' })
  console.log('4) no signal           — response:', response)
}

start('127.0.0.1:9301')
