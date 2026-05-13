# gRPCity Examples

Runnable examples for the [`grpcity`](..) framework. Each subdirectory is
self-contained: it has a `loader.js`, a `server.js`, and a `client.js` (plus
TypeScript variants where applicable). Start the server in one terminal,
then run the client in another.

## Setup

The examples consume `grpcity` via a workspace link in `package.json`, so a
build of the parent project is required the first time:

```bash
# from the repo root
pnpm install
pnpm build

# then, from this directory
cd example
pnpm install
```

## Run

Pick an example, start its server in one terminal, then run its client in
another:

```bash
node helloworld/server.js
node helloworld/client.js
```

For the TypeScript example use `tsx`:

```bash
pnpm exec tsx typescript/server.ts
pnpm exec tsx typescript/client.ts
```

## What's where

| Directory       | What it shows                                                           |
| --------------- | ----------------------------------------------------------------------- |
| `helloworld/`   | The minimal unary RPC. Mirrors the README Quick Start.                  |
| `loader-init/`  | Walk-through of every `loader.init()` option with focused samples.      |
| `stream/`       | All four RPC kinds (unary, client/server/bidi stream) using async APIs. |
| `multiService/` | Two services on one server, plus a server middleware for access logs.   |
| `middleware/`   | Client- and server-side `(ctx, next)` middleware patterns.              |
| `errors/`       | Server throws + client deadline; how to read `GrpcClientError` fields.  |
| `abortSignal/`  | Cancelling RPCs with `AbortController` / `AbortSignal.timeout`.         |
| `tls/`          | Mutual TLS using the certs in `../certs/`.                              |
| `reflection/`   | Server-side reflection so tools like `grpcurl` can introspect.          |
| `typescript/`   | The same minimal flow written in TypeScript with `tsx`.                 |

## Recommended reading order

1. `helloworld/` — get the request/response loop in muscle memory.
2. `loader-init/` — understand the loader options before they bite.
3. `stream/` — see how each streaming kind looks with `for await`.
4. `middleware/` — when you start needing logging, auth, or tracing.
5. `errors/` and `abortSignal/` — how failures surface and how to cancel work.
6. `multiService/` and `reflection/` — for production-shaped servers.
7. `tls/` — when you're ready to put it on the wire.

## Regenerating TLS certs

`certs/` ships with a CA + server + client cert pair valid for 10 years.
If you need to regenerate them:

```bash
cd certs
./genCert.sh
```
