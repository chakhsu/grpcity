export type MiddlewareFunction = (
  context: any,
  next: () => Promise<any>
) => Promise<any>
/**
 * Compose `middleware` returning
 * a fully valid middleware comprised
 * of all those which are passed.
 *
 * @param {Array} middleware
 * @return {Function}
 * @api public
 */
export declare const compose: (
  middleware: MiddlewareFunction[]
) => (context: any, next: () => Promise<any>) => Promise<any>
