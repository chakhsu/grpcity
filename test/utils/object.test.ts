import { get } from '../../src/utils/object'

describe('utils/object.get', () => {
  test('returns a top-level field', () => {
    expect(get({ a: 1 }, 'a')).toBe(1)
  })

  test('walks nested paths', () => {
    expect(get({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42)
  })

  test('returns the default when a leaf is missing', () => {
    expect(get({ a: 1 }, 'b', 'fallback')).toBe('fallback')
  })

  test('returns the default when an intermediate segment is null', () => {
    expect(get({ a: null }, 'a.b.c', 'fallback')).toBe('fallback')
  })

  test('returns the default when an intermediate segment is undefined', () => {
    expect(get({}, 'a.b', 'fallback')).toBe('fallback')
  })

  test('returns the default when an intermediate segment is a primitive', () => {
    expect(get({ a: 'string' }, 'a.b', 'fallback')).toBe('fallback')
  })

  test('returns undefined when no default is supplied and the path is missing', () => {
    expect(get({ a: 1 }, 'b')).toBeUndefined()
  })

  test('returns the default when called with a non-object root', () => {
    expect(get(null, 'a', 'fallback')).toBe('fallback')
    expect(get(undefined, 'a', 'fallback')).toBe('fallback')
  })

  test('preserves falsy leaf values without applying the default', () => {
    expect(get({ a: 0 }, 'a', 'fallback')).toBe(0)
    expect(get({ a: '' }, 'a', 'fallback')).toBe('')
    expect(get({ a: false }, 'a', 'fallback')).toBe(false)
  })
})
