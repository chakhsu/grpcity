import type { PackageDefinition } from '@grpc/proto-loader'

export const prefixingDefinition = (packageDefinition: any, packagePrefix: string) => {
  for (const qualifiedName in packageDefinition) {
    const definition = packageDefinition[qualifiedName]
    const newPackage = `${packagePrefix}.${qualifiedName}`
    if (definition.format && definition.type && definition.fileDescriptorProtos) {
      packageDefinition[newPackage] = definition
    } else {
      const newDefinition: any = {}
      for (const method in definition) {
        const service = definition[method]
        newDefinition[method] = Object.assign({}, service, {
          path: service.path.replace(/^\//, `/${packagePrefix}.`)
        })
      }
      packageDefinition[newPackage] = newDefinition
    }
  }

  return packageDefinition as PackageDefinition
}
