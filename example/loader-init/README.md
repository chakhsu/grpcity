# loader.init()

Focused samples for `loader.init()` — what each option does, when to reach
for it, and what it changes on the wire.

## Quick reference

```js
await loader.init(options?)
```

| Option          | Type                           | Default                                                                                                | Purpose                                                                                                                                                              |
| --------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isDev`         | `boolean`                      | `false`                                                                                                | Toggles "dev mode". On its own it does nothing visible; it gates `packagePrefix`.                                                                                    |
| `packagePrefix` | `string`                       | _(none)_                                                                                               | Only honored when `isDev` is true. Rebinds every loaded service/type under `<prefix>.<originalName>`. Useful for sandboxing tenants, branches, or test environments. |
| `loadOptions`   | `@grpc/proto-loader` `Options` | see `defaultLoadOptions` (`keepCase`, `enums:String`, `longs:String`, `defaults:false`, `oneofs:true`) | Passed straight through to `protoLoader.load`. Your object overrides the defaults field-by-field.                                                                    |

Notes:

- `init()` is **idempotent** and **concurrent-safe** — see
  [`04-concurrent-init.js`](./04-concurrent-init.js).
- `initServer`, `initClients`, and `initReflection` call `init()` themselves
  if you haven't, so an explicit `await loader.init()` is only needed when
  you want to pass options or call `service()`/`type()` directly.

## Samples

| File                                               | What it covers                                         |
| -------------------------------------------------- | ------------------------------------------------------ |
| [`01-default.js`](./01-default.js)                 | `init()` with no arguments — minimum viable setup.     |
| [`02-dev-prefix.js`](./02-dev-prefix.js)           | `isDev` + `packagePrefix` and the resulting wire path. |
| [`03-load-options.js`](./03-load-options.js)       | Overriding `keepCase`, `enums`, and `defaults`.        |
| [`04-concurrent-init.js`](./04-concurrent-init.js) | Concurrent and post-init `init()` calls.               |

## Run

```bash
node 01-default.js
node 02-dev-prefix.js
node 03-load-options.js
node 04-concurrent-init.js
```

Each sample owns its own server lifecycle (start + shutdown), so you can
run them one after another without managing ports manually.
