# Benchmark Test

Tool: https://ghz.sh

### gRPCity

```
node benchmark/server-grpcity.js

ghz --insecure \
    --proto ./benchmark/helloworld.proto \
    --call helloworld.Greeter/SayHello \
    -d '{"name": "grpcity"}' \
    -n 10000 \
    -c 100  \
    0.0.0.0:9099
```

result:

```
Summary:
  Count:        10000
  Total:        2.02 s
  Slowest:      64.17 ms
  Fastest:      1.36 ms
  Average:      17.22 ms
  Requests/sec: 4942.17

Response time histogram:
  1.355  [1]    |
  7.636  [339]  |∎∎∎
  13.918 [3251] |∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎
  20.199 [3887] |∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎
  26.480 [1502] |∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎
  32.761 [622]  |∎∎∎∎∎∎
  39.042 [175]  |∎∎
  45.324 [130]  |∎
  51.605 [31]   |
  57.886 [30]   |
  64.167 [32]   |

Latency distribution:
  10 % in 9.75 ms
  25 % in 12.52 ms
  50 % in 15.38 ms
  75 % in 20.27 ms
  90 % in 26.62 ms
  95 % in 31.47 ms
  99 % in 44.53 ms

Status code distribution:
  [OK]   10000 responses
```

### grpc-js

```
node benchmark/server-grpcjs.js

ghz --insecure \
    --proto ./benchmark/helloworld.proto \
    --call helloworld.Greeter/SayHello \
    -d '{"name": "grpcity"}' \
    -n 10000 \
    -c 100  \
    0.0.0.0:9098
```

result:

```
Summary:
  Count:        10000
  Total:        2.54 s
  Slowest:      68.57 ms
  Fastest:      1.46 ms
  Average:      21.11 ms
  Requests/sec: 3936.49

Response time histogram:
  1.458  [1]    |
  8.169  [297]  |∎∎∎
  14.881 [1556] |∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎
  21.592 [3900] |∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎
  28.303 [2702] |∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎
  35.014 [1088] |∎∎∎∎∎∎∎∎∎∎∎
  41.725 [296]  |∎∎∎
  48.437 [97]   |∎
  55.148 [56]   |∎
  61.859 [2]    |
  68.570 [5]    |

Latency distribution:
  10 % in 12.27 ms
  25 % in 16.06 ms
  50 % in 20.32 ms
  75 % in 25.07 ms
  90 % in 30.95 ms
  95 % in 34.49 ms
  99 % in 44.33 ms

Status code distribution:
  [OK]   10000 responses
```

### Conclusion

Compared with grpc-js, gRPCity has no loss and almost the same performance.
