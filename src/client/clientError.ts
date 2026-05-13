import { Metadata } from '@grpc/grpc-js'

export const createClientError = (err: any, metadata?: Metadata) => {
  // AbortSignal-driven cancellation hands us an `AbortError` (DOMException).
  // Pass it through verbatim so callers can branch on err.name === 'AbortError'.
  if (err?.name === 'AbortError') {
    return err
  }
  // Don't wrap an already-wrapped GrpcClientError; it would lose code/details.
  if (err?.name === 'GrpcClientError') {
    return err
  }

  const newError = new Error() as {
    name: string
    code: string
    message: string
    stack: string
  }

  newError.name = 'GrpcClientError'
  newError.code = err.code
  newError.message = `${metadata?.get('x-service-path')} (${err.message})`

  const stacks = newError.stack!.split('\n')
  newError.stack = [stacks[0], ...stacks.slice(2), '    ...', ...(err.stack!.split('\n').slice(1, 3) as string[])].join('\n')

  return newError
}
