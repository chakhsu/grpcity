# gRPCity ![build-status](https://github.com/chakhsu/grpcity/actions/workflows/build.yml/badge.svg) ![npm](https://img.shields.io/npm/v/grpcity) ![license](https://img.shields.io/npm/l/grpcity)

<img src="./docs/grpcity-logo.svg" width="160" height="160" alt="grpcity logo" align="right">

[English](./README.md) | [简体中文](./README_CN.md)

## Introduction

`gRPCity` is a gRPC microservices library running on Node.js. It combines
`proto-loader` and `grpc-js` to offer an exceptionally easy way to load proto
files. It simplifies many complex technical concepts, allowing clients and
servers to be implemented with just a few functions. Additionally, it provides
numerous advanced features to meet the needs of most development scenarios.

> The name is derived from "gRPC + City = gRPCity", symbolizing the author's
> hope that this library can support the development of business cities. Taking
> a technological perspective as the foundation, it enables everyone to focus on
> business and better support delivery.

Here is the feature:

- **API**: Communication protocol is based on gRPC and defined through Protobuf.
- **Protobuf**: Supports only dynamic load, simplifying the loading process of protobuf files.
- **Client**: Configured once, callable anytime, anywhere, and supports multi-server invocation.
- **Server**: Simplifies the initialization process with a three-step start, supporting multi-server deployment.
- **Credentials**: Complete support for certificate loading on both the client and server, providing communication encryption capabilities.
- **No-Route**: No routing, RPC is inherently bound to methods.
- **Middleware**: Both client and server support middleware.
- **Metadata**: Standardizes the transmission and retrieval of metadata.
- **Error**: Provides dedicated Error objects to ensure targeted handling of
  exceptions after catching.
- **Promise**: Supports promisify internally in RPC methods while also
  preserving callbackify.
- **Config**: Aligned with official configurations, supports protobuf load configurations and gRPC channel configurations.
- **Typescript**: Implemented purely in TypeScript with comprehensive types.

...and a lot more.

---

View full documentation and examples on [grpcity.js.org](https://grpcity.js.org).

## Quick Start

### Install

```bash
npm i grpcity
```

### Proto

First, create the `greeter.proto` file and write the following content in it:

```proto
syntax = "proto3";

package helloworld;

service Greeter {
  rpc SayGreet(Message) returns (Message) {}
}

message Message {
  string message = 1;
}
```

### Loader

Next, create `loader.js` and write the following code in it:

```js
import { ProtoLoader } from 'grpcity'
import path from 'node:path'

export default new ProtoLoader({
  location: path.join(__dirname, './'),
  files: ['greeter.proto']
})
```

### Server

Then, create `server.js` and write the following code in it:

```js
import loader from './loader.js'

class Greeter {
  async sayGreet(ctx) {
    const { message } = ctx.request
    return {
      message: `hello ${message || 'world'}`
    }
  }
}

const start = async (addr) => {
  await loader.init()

  const server = await loader.initServer()
  server.add('helloworld.Greeter', new Greeter())

  await server.listen(addr)
  console.log('gRPC Server is started: ', addr)
}

start('127.0.0.1:9099')
```

### Client

Finally, create `client.js` and write the following code in it:

```js
import loader from './loader.js'

const start = async (addr) => {
  await loader.init()

  const clients = await loader.initClients({
    services: {
      'helloworld.Greeter': addr
    }
  })

  const client = clients.get('helloworld.Greeter')
  const result = await client.sayGreet({ message: 'greeter' })
  console.log('sayGreet', result.response)
}

start('127.0.0.1:9099')
```

Once the programming work is completed, you can start it in the terminal by running:

```sh
node ./server.js
node ./client.js
```

---

View full documentation and examples on [grpcity.js.org](https://grpcity.js.org).

## License

Released under the MIT License.
