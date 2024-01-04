import assert from 'node:assert'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import * as protobuf from 'protobufjs'
import * as Descriptor from 'protobufjs/ext/descriptor'
import * as _ from 'lodash-es'

import Server from './server'
import Clients from './client'
import { prefixingDefinition } from './utils/definition'
import { assertProtoFileOptionsOptions, attemptInitOptions, attemptInitClientsOptions } from './schema/loader'
import type { ClientsOptionsType, ServerOptionsType } from './schema/loader'
import type { ProtoFileOptionsType, ProtoFileOptionType, InitOptionsType } from './schema/loader'

export class ProtoLoader {
  private _protoFiles: ProtoFileOptionType[]
  private _types?: grpc.GrpcObject
  private _isDev?: boolean
  private _packagePrefix?: string
  private _packageDefinition?: protoLoader.PackageDefinition
  private _insecureClientCredentials?: grpc.ChannelCredentials
  private _insecureServerCredentials?: grpc.ServerCredentials
  private _reflectedRoot?: protobuf.Root

  constructor(protoFileOptions: ProtoFileOptionsType) {
    assertProtoFileOptionsOptions(protoFileOptions)
    this._protoFiles = Array.isArray(protoFileOptions) ? protoFileOptions : [protoFileOptions]
  }

  async init(InitOptions?: InitOptionsType) {
    const newInitOptions = attemptInitOptions(InitOptions)

    if (this._types) {
      return
    }

    const { isDev, packagePrefix, loadOptions } = newInitOptions

    try {
      this._isDev = isDev
      this._packagePrefix = packagePrefix

      loadOptions.includeDirs = this._protoFiles.map((p) => p.location).concat(loadOptions.includeDirs || [])
      const files = this._protoFiles.reduce((result, p) => {
        if (p.files && p.files.length > 0) {
          result.push(...p.files)
        }
        return result
      }, [] as string[])

      const packageDefinition = await protoLoader.load(files, loadOptions)

      if (this._packagePrefix) {
        this._packageDefinition = prefixingDefinition(packageDefinition, packagePrefix)
      } else {
        this._packageDefinition = packageDefinition
      }

      this._types = grpc.loadPackageDefinition(this._packageDefinition)
    } catch (err) {
      throw err
    }
  }

  async initClients(options: ClientsOptionsType) {
    if (!this._packageDefinition) {
      await this.init()
    }
    const clientsOptions = attemptInitClientsOptions(options)
    return new Clients(this, clientsOptions)
  }

  async initServer(options?: ServerOptionsType) {
    if (!this._packageDefinition) {
      await this.init()
    }
    return new Server(this, options)
  }

  makeClientCredentials(rootCerts?: Buffer, privateKey?: Buffer, certChain?: Buffer, verifyOptions?: any) {
    if (rootCerts && privateKey && certChain) {
      return grpc.credentials.createSsl(rootCerts, privateKey, certChain, verifyOptions)
    } else {
      if (!this._insecureClientCredentials) {
        this._insecureClientCredentials = grpc.credentials.createInsecure()
      }
      return this._insecureClientCredentials
    }
  }

  makeServerCredentials(rootCerts?: Buffer, keyCertPairs?: grpc.KeyCertPair[], checkClientCertificate?: boolean) {
    if (rootCerts && keyCertPairs) {
      return grpc.ServerCredentials.createSsl(rootCerts, keyCertPairs, checkClientCertificate)
    } else {
      if (!this._insecureServerCredentials) {
        this._insecureServerCredentials = grpc.ServerCredentials.createInsecure()
      }
      return this._insecureServerCredentials
    }
  }

  makeMetadata(initialValues: Record<string, any>) {
    const meta = new grpc.Metadata()
    if (typeof initialValues === 'object') {
      Object.entries(initialValues).forEach(([key, value]: [string, any]) => {
        if (Array.isArray(value)) {
          value.map((v) => meta.add(key, _.isString(v) ? v : Buffer.from(v)))
        } else {
          meta.add(key, _.isString(value) ? value : Buffer.from(value))
        }
      })
    }
    return meta
  }

  service(name: string) {
    assert(this._types, 'Must called loader init() first. proto file has not been loaded.')
    const fullName = this._isDev ? `${this._packagePrefix}.${name}` : name
    const service = _.get(this._types, `${fullName}`)
    assert(service, `Cannot find service with name: ${fullName}, please check whether the protos file is configured incorrectly.`)
    return (service as grpc.ServiceClientConstructor).service
  }

  type(name: string) {
    assert(this._types, 'Must called loader init() first. proto file has not been loaded.')
    const fullName = this._isDev ? `${this._packagePrefix}.${name}` : name
    const type = _.get(this._types, `${fullName}`)
    assert(type, `Cannot find type with name: ${fullName}, please check whether the protos file is configured incorrectly.`)
    return type
  }

  message(name: string) {
    let root = this._reflectedRoot

    if (root) {
      const found = root.lookupType(name)
      if (found) {
        return found
      }
    }

    const descriptor = (this.type(name) as grpc.ProtobufTypeDefinition).fileDescriptorProtos.map((proto: any) =>
      Descriptor.FileDescriptorProto.decode(proto)
    )
    root = (protobuf.Root as protobuf.RootConstructor).fromDescriptor({
      file: descriptor as Descriptor.IFileDescriptorProto[]
    })

    this._reflectedRoot = root

    return root.lookupType(name)
  }
}
