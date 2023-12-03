"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const protobuf = __importStar(require("protobufjs"));
const Descriptor = __importStar(require("protobufjs/ext/descriptor"));
const _ = __importStar(require("lodash"));
const Joi = __importStar(require("joi"));
const loader_1 = __importDefault(require("./schema/loader"));
const prefixingDefinition_1 = __importDefault(require("./util/prefixingDefinition"));
const defaultChannelOptions_1 = require("./config/defaultChannelOptions");
const defaultLoadOptions_1 = require("./config/defaultLoadOptions");
const clientProxy_1 = __importDefault(require("./proxy/clientProxy"));
const serverProxy_1 = __importDefault(require("./proxy/serverProxy"));
class GrpcLoader {
    constructor(protoFileOptions) {
        Joi.assert(protoFileOptions, loader_1.default.constructor, 'new GrpcLoader() params Error');
        this._protoFiles = Array.isArray(protoFileOptions) ? protoFileOptions : [protoFileOptions];
        this._clientMap = new Map();
        this._clientAddrMap = new Map();
    }
    async init({ services = undefined, isDev = false, packagePrefix = '', loadOptions = {}, channelOptions = {}, appName } = {}) {
        Joi.assert({ services, loadOptions, isDev, channelOptions, appName }, loader_1.default.init, 'GrpcLoader.init() params Error');
        if (this._types) {
            return;
        }
        try {
            loadOptions = Object.assign({}, defaultLoadOptions_1.defaultLoadOptions, loadOptions);
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
                this._packageDefinition = (0, prefixingDefinition_1.default)(packageDefinition, packagePrefix);
            }
            else {
                this._packageDefinition = packageDefinition;
            }
            this._types = grpc.loadPackageDefinition(this._packageDefinition);
        }
        catch (err) {
            throw err;
        }
        if (services) {
            await this.initClients({ services, channelOptions });
        }
    }
    async initClients({ services, channelOptions = {}, credentials = undefined }) {
        Joi.assert({ services, channelOptions }, loader_1.default.initClients, 'GrpcLoader.initClients() Options Error');
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
    makeCredentials(rootCerts, privateKey, certChain, verifyOptions) {
        if (rootCerts && privateKey && certChain) {
            return grpc.credentials.createSsl(rootCerts, privateKey, certChain, verifyOptions);
        }
        else {
            if (!this._insecureCredentials) {
                this._insecureCredentials = grpc.credentials.createInsecure();
            }
            return this._insecureCredentials;
        }
    }
    service(name) {
        (0, node_assert_1.default)(this._types, 'Must called init() first. proto file has not been loaded.');
        const fullName = this._isDev ? `${this._packagePrefix}.${name}` : name;
        const service = _.get(this._types, `${fullName}.service`);
        (0, node_assert_1.default)(service, `Cannot find service with name: ${fullName}, please check if the protos file is configured incorrectly or if the corresponding proto file is missing.`);
        return service;
    }
    type(name) {
        (0, node_assert_1.default)(this._types, 'Must called init() first. proto file has not been loaded.');
        const fullName = this._isDev ? `${this._packagePrefix}.${name}` : name;
        const type = _.get(this._types, `${fullName}`);
        (0, node_assert_1.default)(type, `Cannot find type with name: ${fullName}, please check if the protos file is configured incorrectly or if the corresponding proto file is missing.`);
        return type;
    }
    message(name) {
        let root = this._reflectedRoot;
        if (root) {
            const found = root.lookupType(name);
            if (found) {
                return found;
            }
        }
        const descriptor = this.type(name).fileDescriptorProtos.map((proto) => Descriptor.FileDescriptorProto.decode(proto));
        root = protobuf.Root.fromDescriptor({ file: descriptor });
        this._reflectedRoot = root;
        return root.lookupType(name);
    }
    client(name, { host = undefined, port = undefined, timeout = undefined, credentials = undefined, channelOptions = {} } = {}) {
        const isDefaultClient = !(host && port);
        const addr = `${host}:${port}`;
        const cacheKeyPrefix = isDefaultClient ? 'defaultAddr' : addr.replace(/\./g, '-');
        const cacheKey = `proxy.${cacheKeyPrefix}.${name}.${timeout}`;
        if (this._clientMap.has(cacheKey)) {
            return this._clientMap.get(cacheKey);
        }
        else {
            const client = this._makeClient(isDefaultClient, name, addr, credentials, channelOptions);
            const appName = this._appName;
            const proxy = clientProxy_1.default._proxy(client, { timeout }, appName);
            this._clientMap.set(cacheKey, proxy);
            return proxy;
        }
    }
    realClient(name, { host = undefined, port = undefined, credentials = undefined, channelOptions = {} } = {}) {
        const isDefaultClient = !(host && port);
        const client = this._makeClient(isDefaultClient, name, `${host}:${port}`, credentials, channelOptions);
        return client;
    }
    clientWithoutCache(name, { addr, timeout = undefined, credentials = undefined, channelOptions = {} } = {}) {
        const client = this._makeClientWithoutCache(false, name, addr, credentials, channelOptions);
        const appName = this._appName;
        const proxy = clientProxy_1.default._proxy(client, { timeout }, appName);
        return proxy;
    }
    _makeClient(isDefaultClient, name, addr, credentials, channelOptions = {}) {
        const ctBool = !!credentials;
        const cacheKeyPrefix = isDefaultClient ? 'defaultAddr' : addr.replace(/\./g, '-');
        const cacheKeyWithCt = `${cacheKeyPrefix}.${name}.${ctBool}`;
        const cacheKey = `${cacheKeyPrefix}.${name}`;
        if (this._clientMap.has(cacheKey)) {
            return this._clientMap.get(cacheKey);
        }
        else if (this._clientMap.has(cacheKeyWithCt)) {
            return this._clientMap.get(cacheKeyWithCt);
        }
        else {
            let cacheAddr = addr;
            if (addr === 'undefined:undefined') {
                cacheAddr = this._clientAddrMap.get(name) || addr;
            }
            const client = this._makeClientWithoutCache(isDefaultClient, name, cacheAddr, credentials, channelOptions);
            this._clientAddrMap.set(name, cacheAddr);
            this._clientMap.set(cacheKey, client);
            return client;
        }
    }
    _makeClientWithoutCache(isDefaultClient, name, addr, credentials, channelOptions = {}) {
        channelOptions = Object.assign({}, defaultChannelOptions_1.defaultChannelOptions, channelOptions);
        const ServiceProto = this.type(name);
        const client = new ServiceProto(addr, credentials || this.makeCredentials(), channelOptions);
        return client;
    }
    makeMetadata(initialValues) {
        (0, node_assert_1.default)(this._types, 'Must called init() first. proto file has not been loaded.');
        const meta = new grpc.Metadata();
        if (typeof initialValues === 'object') {
            Object.entries(initialValues).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.map((v) => meta.add(key, _.isString(v) ? v : Buffer.from(v)));
                }
                else {
                    meta.add(key, _.isString(value) ? value : Buffer.from(value));
                }
            });
        }
        return meta;
    }
    initServer(...args) {
        (0, node_assert_1.default)(this._types, 'Must called init() first. proto file has not been loaded.');
        const server = new serverProxy_1.default();
        return server._init(this, ...args);
    }
}
exports.default = GrpcLoader;
module.exports = GrpcLoader;
