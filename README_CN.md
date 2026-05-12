# gRPCity ![build-status](https://github.com/chakhsu/grpcity/actions/workflows/build.yml/badge.svg) ![npm](https://img.shields.io/npm/v/grpcity) ![license](https://img.shields.io/npm/l/grpcity)

<img src="./.github/assert/grpcity-logo.svg" width="130" height="130" alt="grpcity" align="right">

[English](./README.md) | [简体中文](./README_CN.md)

`gRPCity` 是一个开箱即用的 Node.js gRPC 框架。它把 `@grpc/grpc-js` 与
`@grpc/proto-loader` 封装在一套小而克制的 API 之下，让你用十几行代码就能起一个
带类型的 gRPC 服务或客户端，把剩下的时间留给业务逻辑。

## 为什么选 gRPCity

直接用 `@grpc/grpc-js` 功能强大但啰嗦：动态加载、服务绑定、证书、元数据、流式
调用、错误处理都得自己写。gRPCity 把这些样板压扁，但并不把它们藏起来：

- **一份 loader 多处复用**：`.proto` 文件只加载一次，client 和 server 从同一个
  loader 实例派生。
- **Promise 优先**：四类 RPC（unary、client / server / bidi stream）都返回
  Promise 或异步迭代器；需要回调时也保留了 callback 版本。
- **双端中间件**：客户端和服务端都支持 Koa 风格的 `(ctx, next)` 管道，方便接
  日志、鉴权等横切关注点。
- **合理的默认值**：channel options、重试策略、keepalive 已经按典型微服务部署
  预配好。

## 特性

- **API**：基于 HTTP/2 的 gRPC，schema 用 Protobuf 定义。
- **Protobuf**：只支持动态加载，无需 codegen 步骤。
- **Client**：一次配置随处调用，支持 multi-server。
- **Server**：三行启动，单进程支持多服务。
- **Credentials**：客户端和服务端均完整支持 TLS。
- **无路由**：RPC 路径与方法天生绑定。
- **Middleware**：客户端和服务端都支持 Koa 风格的 `(ctx, next)`。
- **Metadata**：提供标准的发送与读取元数据的辅助函数。
- **Reflection**：内置 gRPC Server Reflection。
- **Error**：客户端错误统一以 `GrpcClientError` 抛出，可按 `err.name` 与
  `err.code` 精确处理。
- **Promise 与 callback**：默认异步 API，回调版本保留。
- **Config**:`@grpc/proto-loader` 与 `@grpc/grpc-js` 的所有 channel option
  原样透传。
- **Validation**:参数在运行时通过 [zod](https://zod.dev) 校验。
- **TypeScript**：纯 TS 实现，类型导出齐全。

完整文档与示例：[grpcity.js.org](https://grpcity.js.org)。

## 安装

需要 Node.js >= 18。

```bash
npm i grpcity
# 或
pnpm add grpcity
# 或
yarn add grpcity
```

## 快速开始

下面是一个最小的请求/响应示例。你需要创建三个文件:一份 `.proto` schema、一份
共享的 loader，以及 server 和 client 各一份。

### 1. 定义服务

`greeter.proto`：

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

### 2. 共享 loader

一个 `ProtoLoader` 被 server 和 client 共用，schema 只会被解析一次。

`loader.js`：

```js
import { ProtoLoader } from 'grpcity'
import path from 'node:path'

export default new ProtoLoader({
  location: path.join(__dirname, './'),
  files: ['greeter.proto']
})
```

> **ESM 下的 `__dirname`** — 上述代码为简洁起见使用了 CommonJS 风格的
> `__dirname`。如果你的项目是 ESM（`package.json` 里设了 `"type": "module"`），
> 请把 `__dirname` 替换为 `import.meta.dirname`（Node.js >= 20.11），或在
> 较早的 Node 18 上用 `fileURLToPath(import.meta.url)` 自行派生。

### 3. 实现服务端

每个服务就是一个普通类。方法收到的 `ctx` 包含 `request`、`metadata` 等字段，
返回响应对象即可。

`server.js`：

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

### 4. 客户端调用

客户端通过完全限定的服务名取出，返回的代理会把每个 RPC 方法暴露成异步函数。

`client.js`：

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

运行：

```sh
node ./server.js
node ./client.js
```

## 文档

流式调用、中间件、TLS、Reflection 等完整指南与示例都在文档站：
[grpcity.js.org](https://grpcity.js.org)。

## License

基于 [MIT License](./LICENSE) 发布。
