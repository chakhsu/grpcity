import { compose, MiddlewareFunction } from '../../src/utils/compose'

describe('utils/compose', () => {
  test('runs middleware in order around next()', async () => {
    const order: string[] = []
    const mw: MiddlewareFunction[] = [
      async (_ctx, next) => {
        order.push('a:before')
        await next()
        order.push('a:after')
      },
      async (_ctx, next) => {
        order.push('b:before')
        await next()
        order.push('b:after')
      }
    ]
    const composed = compose(mw)
    await composed({}, async () => {
      order.push('handler')
    })
    expect(order).toEqual(['a:before', 'b:before', 'handler', 'b:after', 'a:after'])
  })

  test('resolves when middleware is empty and no next is supplied', async () => {
    await expect(compose([])({})).resolves.toBeUndefined()
  })

  test('synchronous throw inside middleware rejects the composed promise', async () => {
    const composed = compose([
      (() => {
        throw new Error('sync')
      }) as unknown as MiddlewareFunction
    ])
    await expect(composed({})).rejects.toThrow('sync')
  })

  test('async rejection inside middleware rejects the composed promise', async () => {
    const composed = compose([
      async () => {
        throw new Error('async')
      }
    ])
    await expect(composed({})).rejects.toThrow('async')
  })

  test('calling next() twice rejects with the dedicated error', async () => {
    const composed = compose([
      async (_ctx, next) => {
        await next()
        await next()
      }
    ])
    await expect(composed({}, async () => undefined)).rejects.toThrow('next() called multiple times')
  })

  test('throws TypeError when middleware is not an array', () => {
    expect(() => compose('nope' as unknown as MiddlewareFunction[])).toThrow(TypeError)
  })

  test('throws TypeError when an entry is not a function', () => {
    expect(() => compose([42 as unknown as MiddlewareFunction])).toThrow(TypeError)
  })

  test('passes the same context object to every middleware and next', async () => {
    const ctx = { hits: 0 }
    const composed = compose([
      async (c, next) => {
        c.hits++
        await next()
      },
      async (c, next) => {
        c.hits++
        await next()
      }
    ])
    await composed(ctx, async () => {
      ctx.hits++
    })
    expect(ctx.hits).toBe(3)
  })
})
