import { Metadata, MetadataValue } from '@grpc/grpc-js'

export const combineMetadata = (metadata: Metadata, options: Record<string, unknown>) => {
  Object.keys(options).forEach((key) => {
    ;(metadata as Metadata).set(key, options[key] as MetadataValue)
  })
  return metadata.clone()
}
