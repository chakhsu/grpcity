// gRPC channel options
// Doc: https://grpc.github.io/grpc/core/group__grpc__arg__keys.html
// Doc: https://github.com/grpc/grpc-node/blob/master/packages/grpc-js/src/channel-options.ts
import type { ChannelOptions } from '@grpc/grpc-js'

export const defaultChannelOptions: ChannelOptions = {
  'grpc.min_reconnect_backoff_ms': 1000,
  'grpc.max_reconnect_backoff_ms': 10000,
  'grpc.grpclb_call_timeout_ms': 5000,
  'grpc.keepalive_timeout_ms': 20 * 1000,
  'grpc.keepalive_time_ms': 120 * 1000,
  'grpc.keepalive_permit_without_calls': 1,
  'grpc.enable_retries': 1,
  'grpc.service_config': JSON.stringify({
    retryPolicy: {
      maxAttempts: 4,
      initialBackoff: '0.1s',
      maxBackoff: '1s',
      backoffMultiplier: 2,
      retryableStatusCodes: ['UNAVAILABLE']
    }
  })
}
