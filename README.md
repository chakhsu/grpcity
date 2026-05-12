# gRPCity ![build-status](https://github.com/chakhsu/grpcity/actions/workflows/build.yml/badge.svg) ![npm](https://img.shields.io/npm/v/grpcity) ![license](https://img.shields.io/npm/l/grpcity)

<img src="./.github/assert/grpcity-logo.svg" width="130" height="130" alt="grpcity" align="right">

[English](./README.md) | [简体中文](./README_CN.md)

`gRPCity` is a batteries-included gRPC framework for Node.js. It wraps
`@grpc/grpc-js` and `@grpc/proto-loader` behind a small, opinionated API so
you can stand up a typed gRPC service or client in a handful of lines and
spend the rest of your time on business logic.

## Why gRPCity

Working directly with `@grpc/grpc-js` is powerful but verbose: dynamic loading,
service binding, credentials, metadata, streaming, and error handling are all
on you. gRPCity collapses that boilerplate without hiding it:

- **One loader, many uses** — load `.proto` files once, then spawn clients and
  servers from the same instance.
- **Promise-first** — all four RPC kinds (unary, client/server/bidi stream)
  return Promises or async iterators. Callbacks are still available when you
  need them.
- **Middleware on both sides** — Koa-style `(ctx, next)` pipelines on the
  client and server for cross-cutting concerns like logging and auth.
- **Sensible defaults** — channel options, retry policy, and keepalives are
  preconfigured for typical microservice deployments.

## Features

- **API** — gRPC over HTTP/2, schemas defined in Protobuf.
- **Protobuf** — dynamic loading only; no codegen step.
- **Client** — configure once, call from anywhere; multi-server supported.
- **Server** — three-line bootstrap; multiple services per process.
- **Credentials** — full TLS support on both ends.
- **No routing** — RPC paths are bound to methods automatically.
- **Middleware** — Koa-style `(ctx, next)` on both client and server.
- **Metadata** — standard helpers for sending and reading metadata.
- **Reflection** — gRPC Server Reflection built in.
- **Errors** — client-side errors surface as `GrpcClientError` so callers can
  branch on `err.name` and `err.code` precisely.
- **Promise & callback** — async APIs by default, callback variants kept.
- **AbortSignal** — pass an `AbortSignal` to any RPC call to cancel it.
- **Config** — passthrough for any `@grpc/proto-loader` and `@grpc/grpc-js`
  channel option.
- **Validation** — options are validated at runtime with [zod](https://zod.dev).
- **TypeScript** — written in TS with complete type exports.

Full documentation and examples: [grpcity.js.org](https://grpcity.js.org).

## Install

Requires Node.js >= 18.

```bash
npm i grpcity
# or
pnpm add grpcity
# or
yarn add grpcity
```

## Quick Start

Below is a minimal request/response example. You'll create three files: a
`.proto` schema, a shared loader, and one each for the server and client.

### 1. Define the service

`greeter.proto`:

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

### 2. Share a loader

A single `ProtoLoader` is reused by both the server and the client, so the
schema is parsed exactly once.

`loader.js`:

```js
import { ProtoLoader } from 'grpcity'
import path from 'node:path'

export default new ProtoLoader({
  location: path.join(__dirname, './'),
  files: ['greeter.proto']
})
```

> **`__dirname` in ESM** — the snippet uses CommonJS-style `__dirname` for
> brevity. If your project is ESM (`"type": "module"` in `package.json`),
> swap `__dirname` for `import.meta.dirname` (Node.js >= 20.11) or derive
> it from `import.meta.url` with `fileURLToPath` on older Node 18.

### 3. Implement the server

Each service is an ordinary class. Methods receive a `ctx` with `request`,
`metadata`, and helpers, and return the response object.

`server.js`:

```js
import loader from './loader.js'

class Greeter {
  async sayGreet(ctx) {
    const { message } = ctx.request
    return { message: `hello ${message || 'world'}` }
  }
}

const start = async (addr) => {
  await loader.init()

  const server = await loader.initServer()
  server.add('helloworld.Greeter', new Greeter())

  await server.listen(addr)
  console.log('gRPC Server is started:', addr)
}

start('127.0.0.1:9099')
```

### 4. Call from a client

Clients are looked up by their fully qualified service name. The returned
proxy exposes every RPC method as an async function.

`client.js`:

```js
import loader from './loader.js'

const start = async (addr) => {
  await loader.init()

  const clients = await loader.initClients({
    services: { 'helloworld.Greeter': addr }
  })

  const client = clients.get('helloworld.Greeter')
  const { response } = await client.sayGreet({ message: 'greeter' })
  console.log('sayGreet', response)
}

start('127.0.0.1:9099')
```

Run them:

```sh
node ./server.js
node ./client.js
```

## Documentation

Full guides, streaming examples, middleware, TLS, and reflection are covered
on the documentation site: [grpcity.js.org](https://grpcity.js.org).

## License

Released under the [MIT License](./LICENSE).
