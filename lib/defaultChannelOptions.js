// GRPC options 配置参考文档: https://grpc.github.io/grpc/core/group__grpc__arg__keys.html
module.exports = {
  // grpc库option只接收数值和string类型
  // 配置grpc重连接时间(1s ~ 10s 随机数)
  'grpc.min_reconnect_backoff_ms': 1000,
  'grpc.max_reconnect_backoff_ms': 10000,
  // 通信超时
  'grpc.grpclb_call_timeout_ms': 5000,
  // 下面3个参数解决长期空闲grpc客户端，不能及时发现tcp连接断开问题
  // After waiting for a duration of this time, if the keepalive ping sender does not receive the ping ack, it will close the transport.
  'grpc.keepalive_timeout_ms': (20 * 1000),
  // duration of this time the client/server pings its peer to see if the transport is still alive
  'grpc.keepalive_time_ms': (120 * 1000),
  'grpc.keepalive_permit_without_calls': 1,
  // 通信失败允许grpc库retry
  'grpc.enable_retries': 1,
  // 配置retry参数
  // 参考： https://github.com/grpc/proposal/blob/master/A6-client-retries.md#integration-with-service-config
  'grpc.service_config': JSON.stringify({
    retryPolicy: {
      // 1次正常发送+3次失败重试, 每次重试都有机会在不同于最初失败的子通道上发送
      maxAttempts: 4,
      // 初次重试时间间隔: random(0, initialBackoff) 秒
      // 第n次重试时间; random(0, min(initialBackoff*backoffMultiplier^(n-1), maxBackoff)) 秒
      initialBackoff: '0.1s',
      maxBackoff: '1s',
      backoffMultiplier: 2,
      // 只有在网络不可达情况重试
      retryableStatusCodes: ['UNAVAILABLE']
    }
  })
}
