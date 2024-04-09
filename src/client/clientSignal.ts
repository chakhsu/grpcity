export type CompatAbortSignal = AbortSignal & {
  addEventListener(type: 'abort', listener: () => void): void
  removeEventListener(type: 'abort', listener: () => void): void
}

export const getSignal = (options: Record<string, unknown> | undefined, defaultOptions: Record<string, any>): CompatAbortSignal => {
  options = Object.assign({}, defaultOptions, options)
  const signal = (options.signal ?? new AbortController().signal) as CompatAbortSignal
  return signal
}
