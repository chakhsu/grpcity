import { Status } from '../schema/status'

export const createServerError = (err: any): any => {
  err.code = err.code || Status.INTERNAL
  if (typeof err.stack === 'string') {
    const stack = err.stack.split('\n')
    err.message += ` [Error Message From Server, stack: ${stack[1].trim()}]`
  } else {
    err.message += ' [Error Message From Server]'
  }
  return err
}
