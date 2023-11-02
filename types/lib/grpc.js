var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var assert = require('assert');
var util = require('util');
var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');
var protobuf = require('protobufjs');
var Descriptor = require('protobufjs/ext/descriptor');
var Joi = require('joi');
var _ = require('lodash');
var defaultChannelOptions = require('./defaultChannelOptions');
var defaultLoadOptions = require('./defaultLoadOptions');
var clientProxy = require('./clientProxy');
var serverProxy = require('./serverProxy');
var debug = require('debug')('grpcity');
function prefixingDefinition(packageDefinition, packagePrefix) {
    var _a;
    for (var qualifiedName in packageDefinition) {
        var definition = packageDefinition[qualifiedName];
        var newPackage = "".concat(packagePrefix, ".").concat(qualifiedName);
        if (definition.format && definition.type && definition.fileDescriptorProtos) {
            packageDefinition[newPackage] = definition;
        }
        else {
            var newDefinition = {};
            for (var method in definition) {
                var service = definition[method];
                newDefinition[method] = Object.assign({}, service, { path: service.path.replace(/^\//, "/".concat(packagePrefix, ".")) });
            }
            debug('modified packageDefinition service', (_a = {}, _a[newPackage] = newDefinition, _a));
            packageDefinition[newPackage] = newDefinition;
        }
    }
    return packageDefinition;
}
var addressSchema = Joi.object()
    .pattern(/\.*/, Joi.alternatives([
    Joi.string().regex(/:/, 'host and port like 127.0.0.1:9090'),
    Joi.object().keys({
        host: Joi.string().required(),
        port: Joi.number().integer().min(0).max(65535).required()
    })
]));
var schemas = {
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
};
module.exports = /** @class */ (function () {
    function GrpcLoader(protoFileOptions) {
        Joi.assert(protoFileOptions, schemas.constructor, 'new GrpcLoader() params Error');
        this._protoFiles = Array.isArray(protoFileOptions) ? protoFileOptions : [protoFileOptions];
        this._clientMap = new Map();
        this._clientAddrMap = new Map();
    }
    GrpcLoader.prototype.init = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.services, services = _c === void 0 ? undefined : _c, _d = _b.isDev, isDev = _d === void 0 ? false : _d, _e = _b.packagePrefix, packagePrefix = _e === void 0 ? '' : _e, _f = _b.loadOptions, loadOptions = _f === void 0 ? {} : _f, _g = _b.channelOptions, channelOptions = _g === void 0 ? {} : _g, appName = _b.appName;
        return __awaiter(this, void 0, void 0, function () {
            var files, packageDefinition, err_1;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        Joi.assert({ services: services, loadOptions: loadOptions, isDev: isDev, channelOptions: channelOptions, appName: appName }, schemas.init, 'GrpcLoader.init() params Error');
                        debug('init()', { services: services, loadOptions: loadOptions, isDev: isDev, channelOptions: channelOptions, appName: appName });
                        if (this._types) {
                            return [2 /*return*/];
                        }
                        _h.label = 1;
                    case 1:
                        _h.trys.push([1, 3, , 4]);
                        loadOptions = Object.assign({}, defaultLoadOptions, loadOptions);
                        this._isDev = isDev;
                        this._packagePrefix = packagePrefix;
                        this._appName = appName;
                        loadOptions.includeDirs = this._protoFiles.map(function (p) { return p.location; }).concat(loadOptions.includeDirs || []);
                        files = this._protoFiles.reduce(function (result, p) {
                            if (p.files && p.files.length > 0) {
                                result.push.apply(result, p.files);
                            }
                            return result;
                        }, []);
                        return [4 /*yield*/, protoLoader.load(files, loadOptions)];
                    case 2:
                        packageDefinition = _h.sent();
                        if (this._packagePrefix) {
                            this._packageDefinition = prefixingDefinition(packageDefinition, packagePrefix);
                        }
                        else {
                            this._packageDefinition = packageDefinition;
                        }
                        this._types = grpc.loadPackageDefinition(this._packageDefinition);
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _h.sent();
                        debug(err_1.message, { err: err_1 }, this._protoFiles);
                        throw err_1;
                    case 4:
                        if (!services) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.initClients({ services: services, channelOptions: channelOptions })];
                    case 5:
                        _h.sent();
                        _h.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    GrpcLoader.prototype.initClients = function (_a) {
        var services = _a.services, _b = _a.channelOptions, channelOptions = _b === void 0 ? {} : _b, _c = _a.credentials, credentials = _c === void 0 ? undefined : _c;
        return __awaiter(this, void 0, void 0, function () {
            var serviceNames;
            var _this = this;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        Joi.assert({ services: services, channelOptions: channelOptions }, schemas.initClients, 'GrpcLoader.initClients() Options Error');
                        debug('initClients()', { services: services });
                        if (this._initDefaultClient) {
                            return [2 /*return*/];
                        }
                        if (!!this._packageDefinition) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.init()];
                    case 1:
                        _d.sent();
                        _d.label = 2;
                    case 2:
                        serviceNames = Object.keys(services);
                        serviceNames.forEach(function (name) {
                            var isDefaultClient = true;
                            var addr = _.isString(services[name]) ? services[name] : services[name].host + ':' + services[name].port;
                            _this._makeClient(isDefaultClient, name, addr, credentials, channelOptions);
                        });
                        this._initDefaultClient = true;
                        return [2 /*return*/];
                }
            });
        });
    };
    GrpcLoader.prototype.makeCredentials = function (rootCerts, privateKey, certChain, verifyOptions) {
        if (rootCerts) {
            return grpc.credentials.createSsl(rootCerts, privateKey, certChain, verifyOptions);
        }
        else {
            if (!this._insecureCredentials) {
                this._insecureCredentials = grpc.credentials.createInsecure();
            }
            return this._insecureCredentials;
        }
    };
    GrpcLoader.prototype.service = function (name) {
        assert(this._types, 'Must called init() first. 尚未加载proto文件到loader.');
        var fullName = this._isDev ? "".concat(this._packagePrefix, ".").concat(name) : name;
        debug('get service:', fullName);
        var service = _.get(this._types, "".concat(fullName, ".service"));
        assert(service, "Cannot find service with name: ".concat(fullName, ", \u8BF7\u68C0\u67E5protos\u6587\u4EF6\u662F\u5426\u914D\u7F6E\u9519\u8BEF\uFF0C\u6216\u8005\u6F0F\u6389\u4E86\u5BF9\u5E94\u7684proto\u6587\u4EF6"));
        return service;
    };
    GrpcLoader.prototype.type = function (name) {
        assert(this._types, 'Must called init() first. 尚未加载proto文件到loader.');
        var fullName = this._isDev ? "".concat(this._packagePrefix, ".").concat(name) : name;
        debug('get type:', fullName);
        var type = _.get(this._types, "".concat(fullName));
        assert(type, "Cannot find type with name: ".concat(fullName, ", \u8BF7\u68C0\u67E5protos\u6587\u4EF6\u662F\u5426\u914D\u7F6E\u9519\u8BEF\uFF0C\u6216\u8005\u6F0F\u6389\u4E86\u5BF9\u5E94\u7684proto\u6587\u4EF6"));
        return type;
    };
    GrpcLoader.prototype.message = function (name) {
        var root = this._reflectedRoot;
        if (root) {
            var found = root.lookupType(name);
            if (found) {
                return found;
            }
        }
        debug('create reflected message root:', name);
        root = protobuf.Root.fromDescriptor({
            file: this.type(name).fileDescriptorProtos.map(function (proto) { return Descriptor.FileDescriptorProto.decode(proto); })
        }, root);
        this._reflectedRoot = root;
        return root.lookupType(name);
    };
    // 支持 async 语法的客户端，对 {name, host, port} 组成的客户端进行缓存
    GrpcLoader.prototype.client = function (name, _a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.host, host = _c === void 0 ? undefined : _c, _d = _b.port, port = _d === void 0 ? undefined : _d, _e = _b.timeout, timeout = _e === void 0 ? undefined : _e, _f = _b.credentials, credentials = _f === void 0 ? undefined : _f, _g = _b.channelOptions, channelOptions = _g === void 0 ? {} : _g;
        var isDefaultClient = !(host && port);
        var addr = "".concat(host, ":").concat(port);
        var cacheKeyPrefix = isDefaultClient ? 'defaultAddr' : addr.replace(/\./g, '-');
        var cacheKey = "proxy.".concat(cacheKeyPrefix, ".").concat(name, ".").concat(timeout);
        if (this._clientMap.has(cacheKey)) {
            return this._clientMap.get(cacheKey);
        }
        else {
            var client = this._makeClient(isDefaultClient, name, addr, credentials, channelOptions);
            var appName = this._appName;
            var proxy = clientProxy.proxy(client, { timeout: timeout }, appName);
            this._clientMap.set(cacheKey, proxy);
            return proxy;
        }
    };
    // 原始 callback 语法的客户端，对 {name, host, port} 组成的客户端进行缓存
    GrpcLoader.prototype.realClient = function (name, _a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.host, host = _c === void 0 ? undefined : _c, _d = _b.port, port = _d === void 0 ? undefined : _d, _e = _b.credentials, credentials = _e === void 0 ? undefined : _e, _f = _b.channelOptions, channelOptions = _f === void 0 ? {} : _f;
        var isDefaultClient = !(host && port);
        var client = this._makeClient(isDefaultClient, name, "".concat(host, ":").concat(port), credentials, channelOptions);
        return client;
    };
    // 支持 async 语法的客户端, 但是不做客户端缓存 (用于配合外部服务注册和发现的功能使用)
    GrpcLoader.prototype.clientWithoutCache = function (name, _a) {
        var _b = _a === void 0 ? {} : _a, addr = _b.addr, _c = _b.timeout, timeout = _c === void 0 ? undefined : _c, _d = _b.credentials, credentials = _d === void 0 ? undefined : _d, _e = _b.channelOptions, channelOptions = _e === void 0 ? {} : _e;
        var client = this._makeClientWithoutCache(false, name, addr, credentials, channelOptions);
        var appName = this._appName;
        var proxy = clientProxy.proxy(client, { timeout: timeout }, appName);
        return proxy;
    };
    GrpcLoader.prototype._makeClient = function (isDefaultClient, name, addr, credentials, channelOptions) {
        if (channelOptions === void 0) { channelOptions = {}; }
        var ctBool = !!credentials;
        var cacheKeyPrefix = isDefaultClient ? 'defaultAddr' : addr.replace(/\./g, '-');
        var cacheKeyWithCt = "".concat(cacheKeyPrefix, ".").concat(name, ".").concat(ctBool);
        var cacheKey = "".concat(cacheKeyPrefix, ".").concat(name);
        if (this._clientMap.has(cacheKey)) {
            return this._clientMap.get(cacheKey);
        }
        else if (this._clientMap.has(cacheKeyWithCt)) {
            return this._clientMap.get(cacheKeyWithCt);
        }
        else {
            if (addr === 'undefined:undefined') {
                addr = this._clientAddrMap.get(name);
            }
            var client = this._makeClientWithoutCache(isDefaultClient, name, addr, credentials, channelOptions = {});
            this._clientAddrMap.set(name, addr);
            this._clientMap.set(cacheKey, client);
            return client;
        }
    };
    GrpcLoader.prototype._makeClientWithoutCache = function (isDefaultClient, name, addr, credentials, channelOptions) {
        if (channelOptions === void 0) { channelOptions = {}; }
        channelOptions = Object.assign({}, defaultChannelOptions, channelOptions);
        debug('_makeClient()', { channelOptions: channelOptions });
        var ServiceProto = this.type(name);
        var client = new ServiceProto(addr, credentials || this.makeCredentials(), channelOptions);
        debug("create client: isDefaultClient=".concat(isDefaultClient, " serviceName=").concat(name, " addr=").concat(addr));
        return client;
    };
    GrpcLoader.prototype.makeMetadata = function (initialValues) {
        var meta = new grpc.Metadata();
        if (typeof initialValues === 'object') {
            Object.entries(initialValues).forEach(function (_a) {
                var key = _a[0], value = _a[1];
                if (Array.isArray(value)) {
                    value.map(function (v) { return meta.add(key, _.isString(v) ? v : Buffer.from(v)); });
                }
                else {
                    meta.add(key, _.isString(value) ? value : Buffer.from(value));
                }
            });
        }
        return meta;
    };
    GrpcLoader.prototype.initServer = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return serverProxy._init.apply(serverProxy, args);
    };
    // async func --- to --> callback type func
    // use in grpc server side mostly
    GrpcLoader.prototype.callbackify = function (target, _a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.exclude, exclude = _c === void 0 ? [] : _c, inherit = _b.inherit;
        assert(typeof target === 'object', 'Must callbackify an object');
        assert(Array.isArray(exclude), 'options.exclude must be an array of strings');
        exclude.push.apply(exclude, Object.getOwnPropertyNames(Object.getPrototypeOf({})));
        var allPropertyNames = [];
        allPropertyNames.push.apply(allPropertyNames, Object.keys(target));
        allPropertyNames.push.apply(allPropertyNames, Object.getOwnPropertyNames(Object.getPrototypeOf(target)));
        if (inherit && inherit.prototype) {
            allPropertyNames.push.apply(allPropertyNames, Object.getOwnPropertyNames(inherit.prototype));
        }
        allPropertyNames = __spreadArray([], new Set(allPropertyNames), true);
        var methods = {};
        for (var _i = 0, allPropertyNames_1 = allPropertyNames; _i < allPropertyNames_1.length; _i++) {
            var key = allPropertyNames_1[_i];
            var fn = target[key];
            if (typeof fn === 'function' && key !== 'constructor' && !exclude.includes(key)) {
                if (util.types.isAsyncFunction(fn)) {
                    var eglWrapFunction = serverProxy._proxy(target, key);
                    debug("callbackify async function: ".concat(key));
                    methods[key] = util.callbackify(eglWrapFunction).bind(target);
                }
                else {
                    debug("copy non-async function: ".concat(key));
                    methods[key] = fn.bind(target);
                }
            }
        }
        debug('callbackify()', methods);
        return methods;
    };
    return GrpcLoader;
}());
