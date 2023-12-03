declare const _default: (
  emitter: any,
  event: string | string[],
  options: any
) =>
  | {
      [Symbol.asyncIterator](): any
      next(): Promise<{
        done: boolean
        value: any
      }>
      return?: undefined
    }
  | {
      [x: symbol]: () => any
      next(): Promise<{
        done: boolean
        value: any
      }>
      return(value: any): Promise<{
        done: boolean
        value: any
      }>
      [Symbol.asyncIterator]?: undefined
    }
export default _default
