import { Metadata } from '@grpc/grpc-js'

export const createClientError = (err: any, metadata: Metadata) => {
  const newError = new Error() as {
    name: string
    code: string
    message: string
    stack: string
  }

  newError.name = 'GrpcClientError'
  newError.code = err.code
  newError.message = `${metadata.get('x-service-name')} (${err.message})`

  const stacks = newError.stack!.split('\n')
  newError.stack = [stacks[0], ...stacks.slice(2), '    ...', ...(err.stack!.split('\n').slice(1, 3) as string[])].join('\n')

  return newError
}
