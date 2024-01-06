import assert from 'node:assert'
import * as util from 'node:util'
import { compose, MiddlewareFunction } from '../utils/compose'
import { callUnaryProxy } from './unaryCallProxy'
import { callClientStreamProxy } from './clientStreamingCallProxy'
import { callServerStreamProxy } from './serverStreamingCallProxy'
import { callBidiStreamProxy } from './bidiStreamingCallProxy'

export type CallbackifyOptions = {
  _implementationType: Record<string, { requestStream: boolean; responseStream: boolean }>
  exclude?: string[]
  inherit?: any
}

export const callbackify = (target: any, middleware: MiddlewareFunction[], options: CallbackifyOptions): any => {
  assert(typeof target === 'object', 'Must callbackify an object')

  let { _implementationType, exclude, inherit } = options

  const protoPropertyNames = Object.getOwnPropertyNames(Object.getPrototypeOf({}))
  if (exclude) {
    exclude.push(...protoPropertyNames)
  } else {
    exclude = []
  }

  const allPropertyNames = [
    ...new Set([
      ...Object.keys(target),
      ...Object.getOwnPropertyNames(Object.getPrototypeOf(target)),
      ...(inherit && inherit.prototype ? Object.getOwnPropertyNames(inherit.prototype) : [])
    ])
  ]

  const methods: { [key: string]: any } = {}
  for (const key of allPropertyNames) {
    const fn = target[key]
    if (typeof fn === 'function' && key !== 'constructor' && !exclude.includes(key)) {
      if (util.types.isAsyncFunction(fn)) {
        const eglWrapFunction = proxy(target, key, _implementationType[key], middleware)
        methods[key] = eglWrapFunction
      } else {
        methods[key] = fn
      }
    }
  }

  return methods
}

const proxy = (target: any, key: string, options: any = {}, middleware: MiddlewareFunction[]) => {
  const { requestStream, responseStream } = options

  const composeFunc = compose(middleware)
  const methodsOptions = { requestStream, responseStream }

  // unary
  if (!requestStream && !responseStream) {
    return callUnaryProxy(target, key, composeFunc, methodsOptions)
  }
  // client stream
  if (requestStream && !responseStream) {
    return callClientStreamProxy(target, key, composeFunc, methodsOptions)
  }
  // server stream
  if (!requestStream && responseStream) {
    return callServerStreamProxy(target, key, composeFunc, methodsOptions)
  }
  // duplex stream
  if (requestStream && responseStream) {
    return callBidiStreamProxy(target, key, composeFunc, methodsOptions)
  }
}
