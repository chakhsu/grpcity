export const setDeadline = (options: Record<string, unknown> | undefined, defaultOptions: Record<string, any>) => {
  options = Object.assign({}, defaultOptions, options)
  if (!options?.deadline) {
    const timeout = options.timeout || 1000 * 10
    const deadline = new Date(Date.now() + (timeout as number))
    options.deadline = deadline
    delete options.timeout
  }
  return options
}
