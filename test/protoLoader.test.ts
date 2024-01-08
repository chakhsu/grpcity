import path from 'node:path'
import { ProtoLoader } from '../src'

describe('gRPC Proto Loader', () => {
  test('Should be load a single proto path', async () => {
    const loader = new ProtoLoader({
      location: path.join(__dirname, '../example/proto'),
      files: ['helloworld/service.proto']
    })

    await loader.init()

    expect(!!loader.service('helloworld.Greeter')).toBeTruthy
    expect(!!loader.service('helloworld.Hellor')).toBeTruthy
  })

  test('Should be load multi proto paths', async () => {
    const loader = new ProtoLoader([
      {
        location: path.join(__dirname, '../example/proto'),
        files: ['helloworld/service.proto']
      },
      {
        location: path.join(__dirname, '../example/proto'),
        files: ['stream/service.proto']
      }
    ])

    await loader.init()

    expect(!!loader.service('helloworld.Greeter')).toBeTruthy
    expect(!!loader.service('helloworld.Hellor')).toBeTruthy
    expect(!!loader.service('stream.Hellor')).toBeTruthy
  })

  test('Should get protobuf service definition: Greeter', async () => {
    const loader = new ProtoLoader({
      location: path.join(__dirname, '../example/proto'),
      files: ['helloworld/service.proto']
    })

    await loader.init({
      isDev: true,
      packagePrefix: 'stage.dev'
    })

    const greeterDefinition = loader.service('helloworld.Greeter')
    expect(typeof greeterDefinition.SayGreet).toBe('object')
    expect(typeof greeterDefinition.SayGreet2).toBe('object')
  })

  test('Should get protobuf service definition: Hellor', async () => {
    const loader = new ProtoLoader({
      location: path.join(__dirname, '../example/proto'),
      files: ['helloworld/service.proto']
    })

    await loader.init({
      isDev: true,
      packagePrefix: 'stage.dev'
    })

    const hellorDefinition = loader.service('helloworld.Hellor')
    expect(typeof hellorDefinition.SayHello).toBe('object')
    expect(typeof hellorDefinition.SayHello2).toBe('object')
  })
})
