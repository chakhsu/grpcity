# Benchmark Test

Tool: https://ghz.sh

### gRPCity

```
node test/benchmark/server-grpcity.js

ghz --insecure \
    --proto ./helloworld.proto \
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
  Total:        1.56 s
  Slowest:      30.57 ms
  Fastest:      2.76 ms
  Average:      12.81 ms
  Requests/sec: 6418.79

Response time histogram:
  2.765  [1]    |
  5.545  [132]  |∎
  8.326  [852]  |∎∎∎∎∎∎∎∎∎∎
  11.106 [1977] |∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎
  13.887 [3557] |∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎
  16.667 [2324] |∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎
  19.448 [833]  |∎∎∎∎∎∎∎∎∎
  22.228 [220]  |∎∎
  25.009 [79]   |∎
  27.789 [24]   |
  30.570 [1]    |

Latency distribution:
  10 % in 8.37 ms
  25 % in 10.65 ms
  50 % in 12.83 ms
  75 % in 14.78 ms
  90 % in 16.97 ms
  95 % in 18.47 ms
  99 % in 22.30 ms

Status code distribution:
  [OK]   10000 responses
```

### grpc-js

```
node test/benchmark/server-grpcjs.js

ghz --insecure \
    --proto ./helloworld.proto \
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
  Total:        1.67 s
  Slowest:      58.36 ms
  Fastest:      1.09 ms
  Average:      13.99 ms
  Requests/sec: 5994.90

Response time histogram:
  1.090  [1]    |
  6.817  [534]  |∎∎∎∎∎
  12.544 [4352] |∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎
  18.271 [3427] |∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎∎
  23.998 [1087] |∎∎∎∎∎∎∎∎∎∎
  29.725 [344]  |∎∎∎
  35.452 [149]  |∎
  41.179 [15]   |
  46.906 [52]   |
  52.634 [32]   |
  58.361 [7]    |

Latency distribution:
  10 % in 8.20 ms
  25 % in 10.35 ms
  50 % in 12.66 ms
  75 % in 16.05 ms
  90 % in 21.40 ms
  95 % in 24.94 ms
  99 % in 38.52 ms

Status code distribution:
  [OK]   10000 responses
```

### Conclusion

Compared with grpc-js, gRPCity has no loss and almost the same performance.
