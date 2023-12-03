'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const symbolAsyncIterator = Symbol.asyncIterator || '@@asyncIterator'
const normalizeEmitter = (emitter) => {
  const addListener =
    emitter.on || emitter.addListener || emitter.addEventListener
  const removeListener =
    emitter.off || emitter.removeListener || emitter.removeEventListener
  if (!addListener || !removeListener) {
    throw new TypeError('Emitter is not compatible')
  }
  return {
    addListener: addListener.bind(emitter),
    removeListener: removeListener.bind(emitter)
  }
}
const toArray = (value) => (Array.isArray(value) ? value : [value])
exports.default = (emitter, event, options) => {
  if (typeof options === 'function') {
    options = { filter: options }
  }
  // Allow multiple events
  const events = toArray(event)
  options = {
    rejectionEvents: ['error'],
    resolutionEvents: [],
    limit: Infinity,
    multiArgs: false,
    ...options
  }
  const { limit } = options
  const isValidLimit =
    limit >= 0 && (limit === Infinity || Number.isInteger(limit))
  if (!isValidLimit) {
    throw new TypeError(
      'The `limit` option should be a non-negative integer or Infinity'
    )
  }
  if (limit === 0) {
    // Return an empty async iterator to avoid any further cost
    return {
      [Symbol.asyncIterator]() {
        return this
      },
      async next() {
        return {
          done: true,
          value: undefined
        }
      }
    }
  }
  const { addListener, removeListener } = normalizeEmitter(emitter)
  let isDone = false
  let error
  let hasPendingError = false
  const nextQueue = []
  const valueQueue = []
  let eventCount = 0
  let isLimitReached = false
  const valueHandler = (...args) => {
    eventCount++
    isLimitReached = eventCount === limit
    const value = options.multiArgs ? args : args[0]
    if (nextQueue.length > 0) {
      const { resolve } = nextQueue.shift()
      resolve({ done: false, value })
      if (isLimitReached) {
        cancel()
      }
      return
    }
    valueQueue.push(value)
    if (isLimitReached) {
      cancel()
    }
  }
  const cancel = () => {
    isDone = true
    for (const event of events) {
      removeListener(event, valueHandler)
    }
    for (const rejectionEvent of options.rejectionEvents) {
      removeListener(rejectionEvent, rejectHandler)
    }
    for (const resolutionEvent of options.resolutionEvents) {
      removeListener(resolutionEvent, resolveHandler)
    }
    while (nextQueue.length > 0) {
      const { resolve } = nextQueue.shift()
      resolve({ done: true, value: undefined })
    }
  }
  const rejectHandler = (...args) => {
    error = options.multiArgs ? args : args[0]
    if (nextQueue.length > 0) {
      const { reject } = nextQueue.shift()
      reject(error)
    } else {
      hasPendingError = true
    }
    cancel()
  }
  const resolveHandler = (...args) => {
    const value = options.multiArgs ? args : args[0]
    if (options.filter && !options.filter(value)) {
      return
    }
    if (nextQueue.length > 0) {
      const { resolve } = nextQueue.shift()
      resolve({ done: true, value })
    } else {
      valueQueue.push(value)
    }
    cancel()
  }
  for (const event of events) {
    addListener(event, valueHandler)
  }
  for (const rejectionEvent of options.rejectionEvents) {
    addListener(rejectionEvent, rejectHandler)
  }
  for (const resolutionEvent of options.resolutionEvents) {
    addListener(resolutionEvent, resolveHandler)
  }
  return {
    [symbolAsyncIterator]() {
      return this
    },
    async next() {
      if (valueQueue.length > 0) {
        const value = valueQueue.shift()
        return {
          done: isDone && valueQueue.length === 0 && !isLimitReached,
          value
        }
      }
      if (hasPendingError) {
        hasPendingError = false
        throw error
      }
      if (isDone) {
        return {
          done: true,
          value: undefined
        }
      }
      return new Promise((resolve, reject) =>
        nextQueue.push({ resolve, reject })
      )
    },
    async return(value) {
      cancel()
      return {
        done: isDone,
        value
      }
    }
  }
}
