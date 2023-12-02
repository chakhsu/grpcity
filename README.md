# gRPCity ![build-status](https://github.com/chakhsu/grpcity/actions/workflows/tests.yml/badge.svg) ![npm](https://img.shields.io/npm/v/grpcity) ![license](https://img.shields.io/npm/l/grpcity) ![code-style](https://img.shields.io/badge/code_style-standard-brightgreen.svg)

[English](./README.md) | [简体中文](./README_CN.md)

## Introduction

`gRPCity` is a gRPC microservices library running on Node.js. It combines `proto-loader` and `grpc-js` to offer an exceptionally easy way to load proto files. It simplifies many complex technical concepts, allowing clients and servers to be implemented with just a few functions. Additionally, it provides numerous advanced features to meet the needs of most development scenarios.

> The name is derived from "gRPC + City = gRPCity", symbolizing the author's hope that this library can support the development of business cities. Taking a technological perspective as the foundation, it enables everyone to focus on business and better support delivery.

Here is the feature:

- **API**: The communication protocol is based on gRPC and defined using Protobuf.
- **Protobuf**: Supports only dynamic loading of pb, simplifying the loading process of pb files.
- **Client**: Configured once and can be called anytime, anywhere, supporting multi-server invocation.
- **Server**: Simplifies the initialization process, starting the server in three steps, supporting multi-server startup.
- **No-Route**: No routing, RPC is inherently bound to methods.
- **Middleware**: Integrates middleware mechanism similar to Koa, providing pre and post-processing capabilities for RPC.
- **Metadata**: Standardizes the transmission and retrieval of metadata.
- **Error**: Provides dedicated Error objects to ensure targeted handling of exceptions after catching.
- **Promise**: Supports promisify internally in RPC methods while also preserving callbackify.
- **Config**: Aligned with official configurations, supports pb load configuration and gRPC channel configuration.
- **Pattern**: Singleton pattern ensures the uniqueness of instance objects.
- **Typescript**: Supported, ensuring compatibility between TS and JS.

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
import GrpcLoader from 'grpcity'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default new GrpcLoader({
  location: path.join(__dirname, './'),
  files: [
    'greeter.proto'
  ]
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

  const server = loader.initServer()
  server.addService('helloworld.Greeter', new Greeter())

  await server.listen(addr)
  console.log('gRPC Server is started: ', addr)
}

start('127.0.0.1:9099')
```

### Client

Finally, create `client.js` and write the following code in it:

```js
import loader from "./loader.js"

const start = async (addr) => {
  await loader.init()

  await loader.initClients({
    services: {
      'helloworld.Greeter': addr
    }
  })

  const client = loader.client('helloworld.Greeter')
  const result = await client.sayGreet({ message: 'greeter' })
  console.log('sayGreet', result.response)
}

start('127.0.0.1:9099')
```

Once the programming work is completed, you can start it by running:

```sh
node ./server.js
node ./client.js
```

---

View full documentation and examples on [grpcity.js.org](https://grpcity.js.org).

## License

Released under the MIT License.
