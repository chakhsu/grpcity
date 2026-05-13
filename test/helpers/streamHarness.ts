import path from 'node:path'
import net from 'node:net'
import { ProtoLoader } from '../../src'

export const streamLoaderOptions = {
  location: path.join(__dirname, '../../example/proto'),
  files: ['stream/service.proto']
}

export const pickPort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      if (typeof addr === 'object' && addr) {
        const port = addr.port
        srv.close(() => resolve(port))
      } else {
        srv.close()
        reject(new Error('Unable to pick a free port'))
      }
    })
  })

export const newLoader = () => new ProtoLoader(streamLoaderOptions)
