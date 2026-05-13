import { EventEmitter } from 'node:events'
import { iterator } from '../../src/utils/iterator'

const collect = async (it: AsyncIterableIterator<any>, limit = 100) => {
  const out: any[] = []
  for await (const v of it) {
    out.push(v)
    if (out.length >= limit) break
  }
  return out
}

describe('utils/iterator', () => {
  test('emits queued values that arrive before next() is called', async () => {
    const emitter = new EventEmitter()
    const it = iterator(emitter, 'data', {}) as AsyncIterableIterator<any>
    emitter.emit('data', 1)
    emitter.emit('data', 2)
    emitter.emit('end')
    setImmediate(() => emitter.emit('end'))
    expect((await it.next()).value).toBe(1)
    expect((await it.next()).value).toBe(2)
    await it.return!(undefined)
  })

  test('blocks next() until a value arrives', async () => {
    const emitter = new EventEmitter()
    const it = iterator(emitter, 'data', {}) as AsyncIterableIterator<any>
    const p = it.next()
    emitter.emit('data', 'late')
    expect((await p).value).toBe('late')
    await it.return!(undefined)
  })

  test('listens on multiple event names', async () => {
    const emitter = new EventEmitter()
    const it = iterator(emitter, ['a', 'b'], {}) as AsyncIterableIterator<any>
    emitter.emit('a', 1)
    emitter.emit('b', 2)
    expect((await it.next()).value).toBe(1)
    expect((await it.next()).value).toBe(2)
    await it.return!(undefined)
  })

  test('multiArgs delivers full argument arrays', async () => {
    const emitter = new EventEmitter()
    const it = iterator(emitter, 'data', { multiArgs: true }) as AsyncIterableIterator<any>
    emitter.emit('data', 'x', 'y', 'z')
    expect((await it.next()).value).toEqual(['x', 'y', 'z'])
    await it.return!(undefined)
  })

  test('limit stops iteration after N events', async () => {
    const emitter = new EventEmitter()
    const it = iterator(emitter, 'data', { limit: 2 }) as AsyncIterableIterator<any>
    emitter.emit('data', 1)
    emitter.emit('data', 2)
    emitter.emit('data', 3)
    expect((await it.next()).value).toBe(1)
    expect((await it.next()).value).toBe(2)
    expect((await it.next()).done).toBe(true)
  })

  test('limit 0 returns an immediately-done iterator', async () => {
    const it = iterator(new EventEmitter(), 'data', { limit: 0 }) as AsyncIterableIterator<any>
    const result = await it.next()
    expect(result).toEqual({ done: true, value: undefined })
    expect(it[Symbol.asyncIterator]()).toBe(it)
  })

  test('rejectionEvents reject pending next()', async () => {
    const emitter = new EventEmitter()
    const it = iterator(emitter, 'data', {}) as AsyncIterableIterator<any>
    const p = it.next()
    emitter.emit('error', new Error('boom'))
    await expect(p).rejects.toThrow('boom')
  })

  test('rejectionEvents queued before next() are thrown on next()', async () => {
    const emitter = new EventEmitter()
    const it = iterator(emitter, 'data', {}) as AsyncIterableIterator<any>
    emitter.emit('error', new Error('queued'))
    await expect(it.next()).rejects.toThrow('queued')
  })

  test('resolutionEvents resolve pending next() with done=true', async () => {
    const emitter = new EventEmitter()
    const it = iterator(emitter, 'data', { resolutionEvents: ['end'] }) as AsyncIterableIterator<any>
    const p = it.next()
    emitter.emit('end', 'final')
    const result = await p
    expect(result.done).toBe(true)
    expect(result.value).toBe('final')
  })

  test('filter drops non-matching resolution values', async () => {
    const emitter = new EventEmitter()
    const it = iterator(emitter, 'data', {
      resolutionEvents: ['end'],
      filter: (v: any) => v === 'final'
    }) as AsyncIterableIterator<any>
    emitter.emit('end', 'ignored')
    emitter.emit('end', 'final')
    const result = await it.next()
    expect(result.done).toBe(true)
    expect(result.value).toBe('final')
  })

  test('options shorthand: a function is treated as the filter', async () => {
    const emitter = new EventEmitter()
    const it = iterator(emitter, 'data', (v: any) => v > 1) as AsyncIterableIterator<any>
    emitter.emit('data', 2)
    expect((await it.next()).value).toBe(2)
    await it.return!(undefined)
  })

  test('return() cancels listeners and reports done', async () => {
    const emitter = new EventEmitter()
    const it = iterator(emitter, 'data', {}) as AsyncIterableIterator<any>
    expect(emitter.listenerCount('data')).toBe(1)
    const result = await it.return!('bye')
    expect(result.done).toBe(true)
    expect(emitter.listenerCount('data')).toBe(0)
  })

  test('breaking out of for-await calls return() under the hood', async () => {
    const emitter = new EventEmitter()
    const it = iterator(emitter, 'data', {}) as AsyncIterableIterator<any>
    queueMicrotask(() => {
      emitter.emit('data', 1)
      emitter.emit('data', 2)
    })
    const out = await collect(it, 1)
    expect(out).toEqual([1])
    expect(emitter.listenerCount('data')).toBe(0)
  })

  test('throws TypeError for invalid limit', () => {
    expect(() => iterator(new EventEmitter(), 'data', { limit: -1 })).toThrow(TypeError)
    expect(() => iterator(new EventEmitter(), 'data', { limit: 1.5 })).toThrow(TypeError)
  })

  test('throws TypeError when emitter has no add/remove listener', () => {
    expect(() => iterator({}, 'data', {})).toThrow(TypeError)
  })

  test('falls back to addListener/removeListener', async () => {
    const handlers: Record<string, Array<(...args: any[]) => void>> = {}
    const emitter = {
      addListener(ev: string, fn: (...args: any[]) => void) {
        handlers[ev] = handlers[ev] || []
        handlers[ev].push(fn)
      },
      removeListener(ev: string, fn: (...args: any[]) => void) {
        handlers[ev] = (handlers[ev] || []).filter((f) => f !== fn)
      }
    }
    const it = iterator(emitter, 'data', {}) as AsyncIterableIterator<any>
    handlers.data.forEach((fn) => fn('hi'))
    expect((await it.next()).value).toBe('hi')
    await it.return!(undefined)
  })
})
