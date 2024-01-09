import type { PackageDefinition } from '@grpc/proto-loader'
import * as descriptor from 'protobufjs/ext/descriptor'

export const prefixingDefinition = (packageDefinition: any, packagePrefix: string) => {
  for (const qualifiedName in packageDefinition) {
    const definition = packageDefinition[qualifiedName]
    const newPackage = `${packagePrefix}.${qualifiedName}`
    if (definition.format && definition.type && definition.fileDescriptorProtos) {
      const newFileDescriptorProtos: any = []
      definition.fileDescriptorProtos.forEach((bin: Buffer) => {
        const proto: Record<string, any> = descriptor.FileDescriptorProto.decode(bin)
        proto.package = `${packagePrefix}.${proto.package}`
        const newProtoService: any = []
        proto.service.forEach((sdp: any) => {
          sdp.method = sdp.method.map((desc: any) => {
            if (desc.inputType) {
              desc.inputType = `.${packagePrefix}${desc.inputType}`
            }
            if (desc.outputType) {
              desc.outputType = `.${packagePrefix}${desc.outputType}`
            }
            return desc
          })
          newProtoService.push(sdp)
        })
        proto.service = newProtoService
        const buffer = descriptor.FileDescriptorProto.encode(proto).finish()
        newFileDescriptorProtos.push(buffer)
      })
      if (newFileDescriptorProtos.length > 0) {
        definition.fileDescriptorProtos = newFileDescriptorProtos
      }
      packageDefinition[newPackage] = definition
      delete packageDefinition[qualifiedName]
    } else {
      const newDefinition: any = {}
      for (const method in definition) {
        const service = definition[method]
        newDefinition[method] = Object.assign({}, service, {
          path: service.path.replace(/^\//, `/${packagePrefix}.`)
        })
      }
      packageDefinition[newPackage] = newDefinition
      delete packageDefinition[qualifiedName]
    }
  }
  return packageDefinition as PackageDefinition
}
