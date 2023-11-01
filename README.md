# gRPCity

<p align="left">
  <a aria-label="NPM version" href="https://www.npmjs.com/package/grpcity">
    <img alt="" src="https://badgen.net/npm/v/grpcity">
  </a>
  <a aria-label="License" href="https://github.com/chakhsu/grpcity/blob/main/LICENSE">
    <img alt="" src="https://badgen.net/npm/license/grpcity">
  </a>
</p>

`gRPC + City = gRPCity`: A simple and easy to use library for Node.js and gRPC.

[English](./README.md) | [简体中文](./README_CN.md)

### Introduction

gPRCity is a simple, easy-to-use, and advanced gRPC microservices library based on Node.js.

> The name is derived from "gRPC + City = gRPCity," symbolizing the author's hope that this library can support the development of business cities. Taking a technological perspective as the foundation, it enables everyone to focus on business and better support delivery. Here, I would like to recommend a game called "Cities: Skylines 2." It is a city simulation game that allows players to experience the excitement and challenges of creating and maintaining a real city firsthand.

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

View full documentation and examples on [chakhsu.github.io/grpcity-docs](https://chakhsu.github.io/grpcity-docs).

### Quick Start

First, create the `greeter.proto` file and write the following content in it:

```proto
syntax = "proto3";

package greeter;

service Greeter {
  rpc SayGreet(Message) returns (Message) {}
}

message Message {
  string message = 1;
}
```

Next, create `loader.js`` and write the following code in it:

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

Then, create `server.js` and write the following code in it:

```js
import loader from './loader.js'

class Greeter {
    constructor(loader) {
        this._loader = loader
    }

    init(server) {
        server.addService(
            this._loader.service('Greeter'),
            this._loader.callbackify(this, { exclude: ['init'] })
        )
    }

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
    const servicers = [new Greeter(loader)]
    await Promise.all(servicers.map(async s => s.init(server)))

    await server.listen(addr)
    console.log('gRPC Server is started: ', addr)
}

start('127.0.0.1:9099')
```

Finally, create `client.js` and write the following code in it:

```js
import loader from "./loader.js"

const start = async (addr) => {
    await loader.init()

    await loader.initClients({
        services: {
            'test.helloworld.Greeter': addr
        }
    })

    const client = loader.client('Greeter')
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

View full documentation and examples on [chakhsu.github.io/grpcity-docs](https://chakhsu.github.io/grpcity-docs).

### License

Released under the MIT License.
