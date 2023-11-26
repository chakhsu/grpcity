// gRPC options, doc: https://grpc.github.io/grpc/core/group__grpc__arg__keys.html
module.exports = {
  // grpc library options accept only numeric and string types
  // Configure grpc reconnect time (1s to 10s random number)
  'grpc.min_reconnect_backoff_ms': 1000,
  'grpc.max_reconnect_backoff_ms': 10000,
  // Communication timeout
  'grpc.grpclb_call_timeout_ms': 5000,
  // The following 3 parameters address the issue of long-idle gRPC clients not promptly detecting TCP connection breaks
  // After waiting for a duration of this time, if the keepalive ping sender does not receive the ping ack, it will close the transport.
  'grpc.keepalive_timeout_ms': (20 * 1000),
  // duration of this time the client/server pings its peer to see if the transport is still alive
  'grpc.keepalive_time_ms': (120 * 1000),
  'grpc.keepalive_permit_without_calls': 1,
  // Communication failure allows grpc library retry
  'grpc.enable_retries': 1,
  // Configure retry parameters
  // Reference: https://github.com/grpc/proposal/blob/master/A6-client-retries.md#integration-with-service-config
  'grpc.service_config': JSON.stringify({
    retryPolicy: {
      // 1 normal send + 3 failed retries, each retry has the opportunity to be sent on a different subchannel than the original failure
      maxAttempts: 4,
      // Initial retry time interval: random(0, initialBackoff) seconds
      // The nth retry time; random(0, min(initialBackoff*backoffMultiplier^(n-1), maxBackoff)) seconds
      initialBackoff: '0.1s',
      maxBackoff: '1s',
      backoffMultiplier: 2,
      // Retry only in the case of network unavailability
      retryableStatusCodes: ['UNAVAILABLE']
    }
  })
}
