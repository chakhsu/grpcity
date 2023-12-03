const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const path = require('path')

const PROTO_PATH = path.resolve(__dirname, 'helloworld.proto')
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
})
const helloProto = grpc.loadPackageDefinition(packageDefinition).helloworld

const implementation = {
  sayHello: (call, callback) => {
    callback(null, { message: 'Hello ' + call.request.name })
  }
}

const start = (addr) => {
  const server = new grpc.Server()
  server.addService(helloProto.Greeter.service, implementation)
  server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), () => {
    server.start()
    console.log('start:', addr)
  })
}

start('0.0.0.0:9098')
