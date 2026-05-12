// Extract a user-supplied AbortSignal from per-call options. Returns
// undefined when the caller did not pass one, so the proxies can take a
// zero-allocation fast path. Also returns the options object with `signal`
// stripped so we never forward our own concept to grpc-js's CallOptions.

export type ClientCallOptions = Record<string, unknown> & { signal?: AbortSignal }

export const extractSignal = (options: ClientCallOptions | undefined): { signal: AbortSignal | undefined; options: ClientCallOptions } => {
  if (!options || !options.signal) {
    return { signal: undefined, options: options || {} }
  }
  const { signal, ...rest } = options
  return { signal, options: rest }
}
