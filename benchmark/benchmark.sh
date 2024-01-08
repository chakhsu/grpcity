 ghz --insecure \
    --proto ./helloworld.proto \
    --call helloworld.Greeter/SayHello \
    -d '{"name": "grpcity"}' \
    -n 10000 \
    -c 100  \
    0.0.0.0:9099

ghz --insecure \
    --proto ./helloworld.proto \
    --call helloworld.Greeter/SayHello \
    -d '{"name": "grpcity"}' \
    -n 10000 \
    -c 100  \
    0.0.0.0:9098
