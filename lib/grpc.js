const assert = require('assert')
const util = require('util')

const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const protobuf = require('protobufjs')
const Descriptor = require('protobufjs/ext/descriptor')

const Joi = require('joi')
const _ = require('lodash')
const defaultChannelOptions = require('./defaultChannelOptions')
const defaultLoadOptions = require('./defaultLoadOptions')
const clientProxy = require('./clientProxy')
const serverProxy = require('./serverProxy')

const debug = require('debug')('grpcity')

function prefixingDefinition (packageDefinition, packagePrefix) {
  for (const qualifiedName in packageDefinition) {
    const definition = packageDefinition[qualifiedName]
    const newPackage = `${packagePrefix}.${qualifiedName}`
    if (definition.format && definition.type && definition.fileDescriptorProtos) {
      packageDefinition[newPackage] = definition
    } else {
      const newDefinition = {}
      for (const method in definition) {
        const service = definition[method]
        newDefinition[method] = Object.assign({}, service, { path: service.path.replace(/^\//, `/${packagePrefix}.`) })
      }
      debug('modified packageDefinition service', { [newPackage]: newDefinition })
      packageDefinition[newPackage] = newDefinition
    }
  }

  return packageDefinition
}

const addressSchema = Joi.object()
  .pattern(/\.*/, Joi.alternatives([
    Joi.string().regex(/:/, 'host and port like 127.0.0.1:9090'),
    Joi.object().keys({
      host: Joi.string().required(),
      port: Joi.number().integer().min(0).max(65535).required()
    })
  ]))

const schemas = {
  constructor: Joi.array().items(Joi.object().keys({
    location: Joi.string().required(),
    files: Joi.array().items(Joi.string()).required()
  })).single(),
  init: Joi.object().keys({
    services: addressSchema.optional(),
    isDev: Joi.boolean().optional(),
    packagePrefix: Joi.string().optional(),
    loadOptions: Joi.object().optional(),
    channelOptions: Joi.object().optional(),
    appName: Joi.string().optional()
  }),
  initClients: Joi.object().keys({
    services: addressSchema.required(),
    channelOptions: Joi.object().optional()
  })
}

module.exports = class GrpcLoader {
  constructor (protoFileOptions) {
    Joi.assert(protoFileOptions, schemas.constructor, 'new GrpcLoader() params Error')

    this._protoFiles = Array.isArray(protoFileOptions) ? protoFileOptions : [protoFileOptions]
    this._clientMap = new Map()
    this._clientAddrMap = new Map()
  }

  async init ({ services = undefined, isDev = false, packagePrefix = '', loadOptions = {}, channelOptions = {}, appName } = {}) {
    Joi.assert({ services, loadOptions, isDev, channelOptions, appName }, schemas.init, 'GrpcLoader.init() params Error')

    debug('init()', { services, loadOptions, isDev, channelOptions, appName })

    if (this._types) {
      return
    }

    try {
      loadOptions = Object.assign({}, defaultLoadOptions, loadOptions)
      this._isDev = isDev
      this._packagePrefix = packagePrefix
      this._appName = appName

      loadOptions.includeDirs = this._protoFiles.map(p => p.location).concat(loadOptions.includeDirs || [])
      const files = this._protoFiles.reduce((result, p) => {
        if (p.files && p.files.length > 0) { result.push(...p.files) }
        return result
      }, [])

      const packageDefinition = await protoLoader.load(files, loadOptions)

      if (this._packagePrefix) {
        this._packageDefinition = prefixingDefinition(packageDefinition, packagePrefix)
      } else {
        this._packageDefinition = packageDefinition
      }

      this._types = grpc.loadPackageDefinition(this._packageDefinition)
    } catch (err) {
      debug(err.message, { err }, this._protoFiles)
      throw err
    }

    if (services) {
      await this.initClients({ services, channelOptions })
    }
  }

  async initClients ({ services, channelOptions = {}, credentials = undefined }) {
    Joi.assert({ services, channelOptions }, schemas.initClients, 'GrpcLoader.initClients() Options Error')

    debug('initClients()', { services })

    if (this._initDefaultClient) {
      return
    }

    if (!this._packageDefinition) {
      await this.init()
    }

    const serviceNames = Object.keys(services)
    serviceNames.forEach(name => {
      const isDefaultClient = true
      const addr = _.isString(services[name]) ? services[name] : services[name].host + ':' + services[name].port
      this._makeClient(isDefaultClient, name, addr, credentials, channelOptions)
    })

    this._initDefaultClient = true
  }

  makeCredentials (rootCerts, privateKey, certChain, verifyOptions) {
    if (rootCerts) {
      return grpc.credentials.createSsl(rootCerts, privateKey, certChain, verifyOptions)
    } else {
      if (!this._insecureCredentials) {
        this._insecureCredentials = grpc.credentials.createInsecure()
      }
      return this._insecureCredentials
    }
  }

  service (name) {
    assert(this._types, 'Must called init() first. 尚未加载proto文件到loader.')
    const fullName = this._isDev ? `${this._packagePrefix}.${name}` : name
    debug('get service:', fullName)
    const service = _.get(this._types, `${fullName}.service`)
    assert(service, `Cannot find service with name: ${fullName}, 请检查protos文件是否配置错误，或者漏掉了对应的proto文件`)
    return service
  }

  type (name) {
    assert(this._types, 'Must called init() first. 尚未加载proto文件到loader.')
    const fullName = this._isDev ? `${this._packagePrefix}.${name}` : name
    debug('get type:', fullName)
    const type = _.get(this._types, `${fullName}`)
    assert(type, `Cannot find type with name: ${fullName}, 请检查protos文件是否配置错误，或者漏掉了对应的proto文件`)
    return type
  }

  message (name) {
    let root = this._reflectedRoot

    if (root) {
      const found = root.lookupType(name)
      if (found) { return found }
    }

    debug('create reflected message root:', name)
    root = protobuf.Root.fromDescriptor({
      file: this.type(name).fileDescriptorProtos.map(proto => Descriptor.FileDescriptorProto.decode(proto))
    }, root)

    this._reflectedRoot = root

    return root.lookupType(name)
  }

  // 支持 async 语法的客户端，对 {name, host, port} 组成的客户端进行缓存
  client (name, { host = undefined, port = undefined, timeout = undefined, credentials = undefined, channelOptions = {} } = {}) {
    const isDefaultClient = !(host && port)
    const addr = `${host}:${port}`
    const cacheKeyPrefix = isDefaultClient ? 'defaultAddr' : addr.replace(/\./g, '-')
    const cacheKey = `proxy.${cacheKeyPrefix}.${name}.${timeout}`

    if (this._clientMap.has(cacheKey)) {
      return this._clientMap.get(cacheKey)
    } else {
      const client = this._makeClient(isDefaultClient, name, addr, credentials, channelOptions)
      const appName = this._appName
      const proxy = clientProxy.proxy(client, { timeout }, appName)
      this._clientMap.set(cacheKey, proxy)
      return proxy
    }
  }

  // 原始 callback 语法的客户端，对 {name, host, port} 组成的客户端进行缓存
  realClient (name, { host = undefined, port = undefined, credentials = undefined, channelOptions = {} } = {}) {
    const isDefaultClient = !(host && port)
    const client = this._makeClient(isDefaultClient, name, `${host}:${port}`, credentials, channelOptions)
    return client
  }

  // 支持 async 语法的客户端, 但是不做客户端缓存 (用于配合外部服务注册和发现的功能使用)
  clientWithoutCache (name, { addr, timeout = undefined, credentials = undefined, channelOptions = {} } = {}) {
    const client = this._makeClientWithoutCache(false, name, addr, credentials, channelOptions)
    const appName = this._appName
    const proxy = clientProxy.proxy(client, { timeout }, appName)
    return proxy
  }

  _makeClient (isDefaultClient, name, addr, credentials, channelOptions = {}) {
    const ctBool = !!credentials
    const cacheKeyPrefix = isDefaultClient ? 'defaultAddr' : addr.replace(/\./g, '-')
    const cacheKeyWithCt = `${cacheKeyPrefix}.${name}.${ctBool}`
    const cacheKey = `${cacheKeyPrefix}.${name}`

    if (this._clientMap.has(cacheKey)) {
      return this._clientMap.get(cacheKey)
    } else if (this._clientMap.has(cacheKeyWithCt)) {
      return this._clientMap.get(cacheKeyWithCt)
    } else {
      if (addr === 'undefined:undefined') {
        addr = this._clientAddrMap.get(name)
      }
      const client = this._makeClientWithoutCache(isDefaultClient, name, addr, credentials, channelOptions = {})
      this._clientAddrMap.set(name, addr)
      this._clientMap.set(cacheKey, client)
      return client
    }
  }

  _makeClientWithoutCache (isDefaultClient, name, addr, credentials, channelOptions = {}) {
    channelOptions = Object.assign({}, defaultChannelOptions, channelOptions)
    debug('_makeClient()', { channelOptions })

    const ServiceProto = this.type(name)
    const client = new ServiceProto(addr, credentials || this.makeCredentials(), channelOptions)
    debug(`create client: isDefaultClient=${isDefaultClient} serviceName=${name} addr=${addr}`)
    return client
  }

  makeMetadata (initialValues) {
    const meta = new grpc.Metadata()
    if (typeof initialValues === 'object') {
      Object.entries(initialValues).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.map(v => meta.add(
            key,
            _.isString(v) ? v : Buffer.from(v)
          ))
        } else {
          meta.add(
            key,
            _.isString(value) ? value : Buffer.from(value)
          )
        }
      })
    }
    return meta
  }

  initServer (...args) {
    return serverProxy.init(...args)
  }

  // async func --- to --> callback type func
  // use in grpc server side mostly
  //
  callbackify (target, { exclude = [], inherit } = {}) {
    assert(typeof target === 'object', 'Must callbackify an object')
    assert(Array.isArray(exclude), 'options.exclude must be an array of strings')

    exclude.push(...Object.getOwnPropertyNames(Object.getPrototypeOf({})))

    let allPropertyNames = []
    allPropertyNames.push(...Object.keys(target))
    allPropertyNames.push(...Object.getOwnPropertyNames(Object.getPrototypeOf(target)))
    if (inherit && inherit.prototype) {
      allPropertyNames.push(...Object.getOwnPropertyNames(inherit.prototype))
    }
    allPropertyNames = [...new Set(allPropertyNames)]

    const methods = {}
    for (const key of allPropertyNames) {
      const fn = target[key]
      if (typeof fn === 'function' && key !== 'constructor' && !exclude.includes(key)) {
        if (util.types.isAsyncFunction(fn)) {
          const eglWrapFunction = serverProxy._proxy(target, key)
          debug(`callbackify async function: ${key}`)
          methods[key] = util.callbackify(eglWrapFunction).bind(target)
        } else {
          debug(`copy non-async function: ${key}`)
          methods[key] = fn.bind(target)
        }
      }
    }

    debug('callbackify()', methods)

    return methods
  }
}
