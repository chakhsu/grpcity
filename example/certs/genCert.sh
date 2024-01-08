#!/bin/bash

echo "Creating certs folder ..."
mkdir -p certs && cd certs

echo "Generating certificates ..."

# 设置密码变量
password="grpcity"

# 证书有效期变量
days=365

# 设置CA相关变量
ca_key="ca.key"
ca_crt="ca.crt"
ca_subject="/C=CN/ST=GD/L=Guangzhou/O=gRPCity/OU=gRPCity/CN=ca"

# 设置服务器相关变量
server_key="server.key"
server_csr="server.csr"
server_crt="server.crt"
server_subject="/C=CN/ST=GD/L=Guangzhou/O=gRPCity/OU=Server/CN=localhost"

# 设置客户端相关变量
client_key="client.key"
client_csr="client.csr"
client_crt="client.crt"
client_subject="/C=CN/ST=GD/L=Guangzhou/O=gRPCity/OU=Client/CN=localhost"

# 生成CA密钥和证书
openssl genrsa -passout pass:$password -des3 -out $ca_key 4096
openssl req -passin pass:$password -new -x509 -days $days -key $ca_key -out $ca_crt -subj  "$ca_subject"

# 生成服务器密钥和证书
openssl genrsa -passout pass:$password -des3 -out $server_key 4096
openssl req -passin pass:$password -new -key $server_key -out $server_csr -subj  "$server_subject"
openssl x509 -req -passin pass:$password -days $days -in $server_csr -CA $ca_crt -CAkey $ca_key -set_serial 01 -out $server_crt
openssl rsa -passin pass:$password -in $server_key -out $server_key

# 生成客户端密钥和证书
openssl genrsa -passout pass:$password -des3 -out $client_key 4096
openssl req -passin pass:$password -new -key $client_key -out $client_csr -subj  "$client_subject"
openssl x509 -passin pass:$password -req -days $days -in $client_csr -CA $ca_crt -CAkey $ca_key -set_serial 01 -out $client_crt
openssl rsa -passin pass:$password -in $client_key -out $client_key
