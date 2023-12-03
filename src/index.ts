import assert from 'node:assert';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as protobuf from 'protobufjs';
import * as Descriptor from 'protobufjs/ext/descriptor';
import * as _ from 'lodash';
import * as Joi from 'joi';

import loaderSchemas from './schema/loader';
import prefixingDefinition from './util/prefixingDefinition';
import { defaultChannelOptions } from './config/defaultChannelOptions';
import { defaultLoadOptions } from './config/defaultLoadOptions';
import clientProxy from './proxy/clientProxy';
import ServerProxy from './proxy/serverProxy';

class GrpcLoader {
  private _protoFiles: any[];
  private _clientMap: Map<string, any>;
  private _clientAddrMap: Map<string, string>;
  private _types: any;
  private _packagePrefix?: string;
  private _appName?: string;
  private _packageDefinition: any;
  private _isDev?: boolean;
  private _reflectedRoot: any;
  private _insecureCredentials?: grpc.ChannelCredentials;
  private _initDefaultClient?: boolean;

  constructor(protoFileOptions: any) {
    Joi.assert(protoFileOptions, loaderSchemas.constructor, 'new GrpcLoader() params Error');

    this._protoFiles = Array.isArray(protoFileOptions) ? protoFileOptions : [protoFileOptions];
    this._clientMap = new Map();
    this._clientAddrMap = new Map();
  }

  async init({ services = undefined, isDev = false, packagePrefix = '', loadOptions = {}, channelOptions = {}, appName }: any = {}) {
    Joi.assert({ services, loadOptions, isDev, channelOptions, appName }, loaderSchemas.init, 'GrpcLoader.init() params Error');

    if (this._types) {
      return;
    }

    try {
      loadOptions = Object.assign({}, defaultLoadOptions, loadOptions);
      this._isDev = isDev;
      this._packagePrefix = packagePrefix;
      this._appName = appName;

      loadOptions.includeDirs = this._protoFiles.map((p) => p.location).concat(loadOptions.includeDirs || []);
      const files = this._protoFiles.reduce((result, p) => {
        if (p.files && p.files.length > 0) {
          result.push(...p.files);
        }
        return result;
      }, []);

      const packageDefinition = await protoLoader.load(files, loadOptions);

      if (this._packagePrefix) {
        this._packageDefinition = prefixingDefinition(packageDefinition, packagePrefix);
      } else {
        this._packageDefinition = packageDefinition;
      }

      this._types = grpc.loadPackageDefinition(this._packageDefinition);
    } catch (err) {
      throw err;
    }

    if (services) {
      await this.initClients({ services, channelOptions });
    }
  }

  async initClients({ services, channelOptions = {}, credentials = undefined }: any) {
    Joi.assert({ services, channelOptions }, loaderSchemas.initClients, 'GrpcLoader.initClients() Options Error');

    if (this._initDefaultClient) {
      return;
    }

    if (!this._packageDefinition) {
      await this.init();
    }

    const serviceNames = Object.keys(services);
    serviceNames.forEach((name) => {
      const isDefaultClient = true;
      const addr = _.isString(services[name]) ? services[name] : services[name].host + ':' + services[name].port;
      this._makeClient(isDefaultClient, name, addr, credentials, channelOptions);
    });

    this._initDefaultClient = true;
  }

  closeClients() {
    this._clientMap.forEach((client, key) => {
      if (client && typeof client.close === 'function') {
        client.close();
      }
    });
    this._clientMap.clear();
    this._clientAddrMap.clear();
    this._initDefaultClient = false;
  }

  makeCredentials(rootCerts?: any, privateKey?: any, certChain?: any, verifyOptions?: any) {
    if (rootCerts && privateKey && certChain) {
      return grpc.credentials.createSsl(rootCerts, privateKey, certChain, verifyOptions);
    } else {
      if (!this._insecureCredentials) {
        this._insecureCredentials = grpc.credentials.createInsecure();
      }
      return this._insecureCredentials;
    }
  }

  service(name: string) {
    assert(this._types, 'Must called init() first. proto file has not been loaded.');
    const fullName = this._isDev ? `${this._packagePrefix}.${name}` : name;
    const service = _.get(this._types, `${fullName}.service`);
    assert(service, `Cannot find service with name: ${fullName}, please check if the protos file is configured incorrectly or if the corresponding proto file is missing.`);
    return service;
  }

  type(name: string) {
    assert(this._types, 'Must called init() first. proto file has not been loaded.');
    const fullName = this._isDev ? `${this._packagePrefix}.${name}` : name;
    const type = _.get(this._types, `${fullName}`);
    assert(type, `Cannot find type with name: ${fullName}, please check if the protos file is configured incorrectly or if the corresponding proto file is missing.`);
    return type;
  }

  message(name: string) {
    let root = this._reflectedRoot;

    if (root) {
      const found = root.lookupType(name);
      if (found) {
        return found;
      }
    }

    const descriptor = this.type(name).fileDescriptorProtos.map((proto: any) => Descriptor.FileDescriptorProto.decode(proto))
    root = (protobuf.Root as protobuf.RootConstructor).fromDescriptor({ file: descriptor });

    this._reflectedRoot = root;

    return root.lookupType(name);
  }

  client(name: string, { host = undefined, port = undefined, timeout = undefined, credentials = undefined, channelOptions = {} }: any = {}) {
    const isDefaultClient = !(host && port);
    const addr = `${host}:${port}`;
    const cacheKeyPrefix = isDefaultClient ? 'defaultAddr' : addr.replace(/\./g, '-');
    const cacheKey = `proxy.${cacheKeyPrefix}.${name}.${timeout}`;

    if (this._clientMap.has(cacheKey)) {
      return this._clientMap.get(cacheKey);
    } else {
      const client = this._makeClient(isDefaultClient, name, addr, credentials, channelOptions);
      const appName = this._appName;
      const proxy = clientProxy._proxy(client, { timeout }, appName);
      this._clientMap.set(cacheKey, proxy);
      return proxy;
    }
  }

  realClient(name: string, { host = undefined, port = undefined, credentials = undefined, channelOptions = {} }: any = {}) {
    const isDefaultClient = !(host && port);
    const client = this._makeClient(isDefaultClient, name, `${host}:${port}`, credentials, channelOptions);
    return client;
  }

  clientWithoutCache(name: string, { addr, timeout = undefined, credentials = undefined, channelOptions = {} }: any = {}) {
    const client = this._makeClientWithoutCache(false, name, addr, credentials, channelOptions);
    const appName = this._appName;
    const proxy = clientProxy._proxy(client, { timeout }, appName);
    return proxy;
  }

  private _makeClient(isDefaultClient: boolean, name: string, addr: string, credentials: any, channelOptions: any = {}) {
    const ctBool = !!credentials;
    const cacheKeyPrefix = isDefaultClient ? 'defaultAddr' : addr.replace(/\./g, '-');
    const cacheKeyWithCt = `${cacheKeyPrefix}.${name}.${ctBool}`;
    const cacheKey = `${cacheKeyPrefix}.${name}`;

    if (this._clientMap.has(cacheKey)) {
      return this._clientMap.get(cacheKey);
    } else if (this._clientMap.has(cacheKeyWithCt)) {
      return this._clientMap.get(cacheKeyWithCt);
    } else {
      let cacheAddr: string = addr
      if (addr === 'undefined:undefined') {
        cacheAddr = this._clientAddrMap.get(name) || addr;
      }
      const client = this._makeClientWithoutCache(isDefaultClient, name, cacheAddr, credentials, channelOptions);
      this._clientAddrMap.set(name, cacheAddr);
      this._clientMap.set(cacheKey, client);
      return client;
    }
  }

  private _makeClientWithoutCache(isDefaultClient: boolean, name: string, addr: string, credentials: any, channelOptions: any = {}) {
    channelOptions = Object.assign({}, defaultChannelOptions, channelOptions);

    const ServiceProto = this.type(name);
    const client = new ServiceProto(addr, credentials || this.makeCredentials(), channelOptions);
    return client;
  }

  makeMetadata(initialValues: any) {
    assert(this._types, 'Must called init() first. proto file has not been loaded.');
    const meta = new grpc.Metadata();
    if (typeof initialValues === 'object') {
      Object.entries(initialValues).forEach(([key, value]: [string, any]) => {
        if (Array.isArray(value)) {
          value.map((v) => meta.add(key, _.isString(v) ? v : Buffer.from(v)));
        } else {
          meta.add(key, _.isString(value) ? value : Buffer.from(value));
        }
      });
    }
    return meta;
  }

  initServer(...args: any[]) {
    assert(this._types, 'Must called init() first. proto file has not been loaded.');
    const server = new ServerProxy()
    return server._init(this, ...args);
  }
}

export default GrpcLoader
module.exports = GrpcLoader
