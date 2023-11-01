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

### 介绍

`gPRCity`： 一套简单、易用和高级的基于 Node.js 的 gRPC 微服务库。

> 名字来源于： gRPC + City = gRPCity，寄托了作者希望这个库能支撑了业务城市的建设，以技术底座的视角，让大家聚焦业务，更好地支撑交付。在这里给大家推荐一款游戏，叫《城市：天际线2》，这是一款城市模拟类游戏，让玩家切身体会从创造到维持一座真正的城市的兴奋和艰辛。

特性如下：

- **API**: 通信协议以 gRPC 为基础，通过 Protobuf 进行定义；
- **Protobuf**: 只支持动态 pb 加载，简化了 pb 文件的加载流程；
- **Client**: 一次配置，随时随处调用，支持 multi-server 的调用；
- **Server**: 简化了初始化流程，三步完成服务端的启动，支持 multi-server 的启动；
- **No-Route**: 无路由，rpc 与 method 天生绑定；
- **Middleware**: 集成了跟 Koa 一样中间件机制，得到了 rpc 前后处理的能力；
- **Metadata**: 规范化了元信息的传递和获取；
- **Error**: 提供了专有 Error 对象，保证异常捕捉后可以针对性处理；
- **Promise**: rpc 方法内部支持了 promisify，同时也保留了 callbackify ；
- **Config**: 与官方配置对齐，支持 pb load 配置和 gRPC channel 配置；
- **Pattern**: 单例模式，保证了实例对象的唯一性；
- **Typescript**: 支持，保证了 ts 和 js 的兼容性；

...还有更多等你发现。

---

可通过访问 [chakhsu.github.io/grpcity-docs](https://chakhsu.github.io/grpcity-docs) 查看完整的文档和示例。

### 快速开始

首先，创建`greeter.proto`文件，编写下面的内容到其中：

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

然后，创建`loader.js`, 编写下面的代码到其中：

```js
import GrpcLoader from 'grpcity'import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default new GrpcLoader({
    location: path.join(__dirname, './'),
    files: [
        'greeter.proto'
    ]
})
```

其次，创建`server.js`, 编写下面的代码到其中：
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

最后，创建`client.js`, 编写下面的代码到其中：

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

完成编程工作之后，就可以通过下面的命令启动~

```sh
node ./server.js
node ./client.js
```

---

可通过访问 [chakhsu.github.io/grpcity-docs](https://chakhsu.github.io/grpcity-docs) 查看完整的文档和示例。


### License

Released under the MIT License.
