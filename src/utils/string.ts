export function isString(value: any): boolean {
  const type = typeof value
  return type === 'string' || value instanceof String
}
