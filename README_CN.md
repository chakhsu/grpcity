# gRPCity ![build-status](https://github.com/chakhsu/grpcity/actions/workflows/build.yml/badge.svg) ![npm](https://img.shields.io/npm/v/grpcity) ![license](https://img.shields.io/npm/l/grpcity)

<img src="./.github/assert/grpcity-logo.svg" width="130" height="130" alt="grpcity" align="right">

[English](./README.md) | [简体中文](./README_CN.md)

## 介绍

`gRPCity` 是一个运行在 Node.js 的 gRPC 微服务库，结合了 `proto-loader` 和
`grpc-js`，提供了非常简易的方式去加载 proto 文件，简化了很多难以理解的技术概念，
只需要几个函数就可以轻松实现客户端和服务端，同时也提供非常多高级的功能满足大多数
开发场景。

> 名字来源于: gRPC + City = gRPCity，寄托了作者希望这个库能支撑了业务城市的建
> 设，以技术底座的视角，让大家聚焦业务，更好地支撑交付。

特性如下：

- **API**: 通信协议以 gRPC 为基础，通过 Protobuf 进行定义；
- **Protobuf**: 只支持动态 pb 加载，简化了 pb 文件的加载流程；
- **Client**: 一次配置，随时随处调用，支持 multi-server 的调用；
- **Server**: 简化了初始化流程，三步完成启动，支持 multi-server 的启动；
- **Credentials**: 客户端和服务端完整地支持了证书加载，提供了通信加密的能力；
- **No-Route**: 无路由，rpc 与 method 天生绑定；
- **Middleware**: 客户端和服务端都支持中间件机制；
- **Metadata**: 规范化了元信息的传递和获取；
- **Reflection**: 服务端内置 gRPC reflection API；
- **Error**: 提供了专有 Error 对象，保证异常捕捉后可以针对性处理；
- **Promise**: rpc 方法内部支持了 promisify，同时也保留了 callbackify ；
- **Config**: 与官方配置对齐，支持 pb load 配置和 gRPC channel 配置；
- **Typescript**: 纯 TS 实现，类型齐全。

...还有更多等你发现。

---

可通过访问 [grpcity.js.org](https://grpcity.js.org) 查看完整的文档和示例。

## 快速开始

### 安装

```bash
npm i grpcity
```

### Proto

首先，创建`greeter.proto`文件，编写下面的内容到其中：

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

然后，创建`loader.js`, 编写下面的代码到其中：

```js
import { ProtoLoader } from 'grpcity'
import path from 'node:path'

export default new ProtoLoader({
  location: path.join(__dirname, './'),
  files: ['greeter.proto']
})
```

### Server

其次，创建`server.js`, 编写下面的代码到其中：

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

最后，创建`client.js`, 编写下面的代码到其中：

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

完成编程工作之后，就可以在终端里执行下面命令进行启动~

```sh
node ./server.js
node ./client.js
```

---

可通过访问 [grpcity.js.org](https://grpcity.js.org) 查看完整的文档和示例。

## License

Released under the MIT License.
