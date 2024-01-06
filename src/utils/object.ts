export function get(object: any, path: string, defaultValue?: any): any {
  const pathArray = path.split('.')

  for (let i = 0; i < pathArray.length; i++) {
    if (!object || typeof object !== 'object') {
      return defaultValue
    }
    object = object[pathArray[i]]
  }

  return object !== undefined ? object : defaultValue
}
