export const createServerError = (err: any): any => {
  err.code = err.code || 13
  if (typeof err.stack === 'string') {
    const stack = err.stack.split('\n')
    err.messages += ` [Error Message From Server, stack: ${stack[1].trim()}]`
  } else {
    err.messages += ' [Error Message From Server]'
  }
  return err
}
