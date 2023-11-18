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
var grpc = require('@grpc/grpc-js');
var assert = require('assert');
var util = require('util');
var compose = require('koa-compose');
var _ = require('lodash');
var Joi = require('joi');
var pEvent = require('p-event');
var debug = require('debug')('grpcity:serverProxy');
var addressSchema = Joi.alternatives([
    Joi.string().regex(/:/, 'host and port like 127.0.0.1:9090'),
    Joi.object().keys({
        host: Joi.string().required(),
        port: Joi.number().integer().min(0).max(65535).required()
    })
]);
var ServerProxy = /** @class */ (function () {
    function ServerProxy() {
        this._middleware = [];
    }
    ServerProxy.prototype._init = function (loader) {
        var _a;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!this._loader) {
            this._loader = loader;
        }
        if (!this._server) {
            this._server = new ((_a = grpc.Server).bind.apply(_a, __spreadArray([void 0], args, false)))();
        }
        return this;
    };
    ServerProxy.prototype.listen = function (addr, credentials) {
        if (credentials === void 0) { credentials = undefined; }
        return __awaiter(this, void 0, void 0, function () {
            var url, bindPort, port;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        assert(this._server, 'must be first init() server before server listen()');
                        Joi.assert(addr, addressSchema, 'server listen() params Error');
                        debug('server listen options', addr);
                        url = _.isString(addr) ? addr : "".concat(addr.host, ":").concat(addr.port);
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                _this._server.bindAsync(url, credentials || _this.makeServerCredentials(), function (err, result) { return (err ? reject(err) : resolve(result)); });
                            })];
                    case 1:
                        bindPort = _a.sent();
                        port = addr.port ? addr.port : Number(addr.match(/:(\d+)/)[1]);
                        assert(bindPort === port, 'server bind port not to be right');
                        this._server.start();
                        return [2 /*return*/];
                }
            });
        });
    };
    ServerProxy.prototype.shutdown = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this._server) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                _this._server.tryShutdown(function (err) {
                                    if (err) {
                                        reject(err);
                                    }
                                    else {
                                        resolve();
                                    }
                                });
                            })];
                    case 1:
                        _a.sent();
                        delete this._server;
                        delete this._loader;
                        return [2 /*return*/];
                }
            });
        });
    };
    ServerProxy.prototype.forceShutdown = function () {
        if (!this._server) {
            return;
        }
        this._server.forceShutdown();
        delete this._server;
        delete this._loader;
    };
    ServerProxy.prototype.makeServerCredentials = function (rootCerts, keyCertPairs, checkClientCertificate) {
        if (rootCerts) {
            return grpc.ServerCredentials.createSsl(rootCerts, keyCertPairs, checkClientCertificate);
        }
        else {
            if (!this._insecureServerCredentials) {
                this._insecureServerCredentials = grpc.ServerCredentials.createInsecure();
            }
            return this._insecureServerCredentials;
        }
    };
    ServerProxy.prototype.addService = function (name, implementation, _a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.exclude, exclude = _c === void 0 ? [] : _c, inherit = _b.inherit;
        var service = this._loader.service(name);
        var options = { exclude: exclude, inherit: inherit, _implementationType: {} };
        Object.keys(service).forEach(function (key) {
            var _a = service[key], requestStream = _a.requestStream, responseStream = _a.responseStream;
            options._implementationType[service[key].originalName] = { requestStream: requestStream, responseStream: responseStream };
        });
        this._server.addService(service, this._callbackify(implementation, options));
    };
    ServerProxy.prototype.removeService = function (name) {
        assert(this._server, 'must be first init() server before server removeService()');
        this._server.removeService(this._loader.service(name));
    };
    ServerProxy.prototype.addMiddleware = function () {
        var _this = this;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        assert(args.length >= 1, 'server addMiddleware() takes at least one argument.');
        if (args.length === 1) {
            if (Array.isArray(args[0])) {
                args[0].forEach(function (fn) {
                    _this._use(fn);
                });
            }
            else {
                this._use(args[0]);
            }
        }
        else {
            args.forEach(function (fn) {
                _this._use(fn);
            });
        }
    };
    ServerProxy.prototype._use = function (fn) {
        if (typeof fn !== 'function')
            throw new TypeError('grpcity loader server middleware must be a function!');
        debug('addMiddleware %s', fn._name || fn.name || '-');
        this._middleware.push(fn);
    };
    // async func --- to --> callback type func
    // use in grpc server side mostly
    ServerProxy.prototype._callbackify = function (target, _a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.exclude, exclude = _c === void 0 ? [] : _c, inherit = _b.inherit, _implementationType = _b._implementationType;
        assert(typeof target === 'object', 'Must callbackify an object');
        assert(Array.isArray(exclude), 'options.exclude must be an array of strings');
        var protoPropertyNames = Object.getOwnPropertyNames(Object.getPrototypeOf({}));
        exclude.push.apply(exclude, protoPropertyNames);
        var allPropertyNames = __spreadArray([], new Set(__spreadArray(__spreadArray(__spreadArray([], Object.keys(target), true), Object.getOwnPropertyNames(Object.getPrototypeOf(target)), true), (inherit && inherit.prototype ? Object.getOwnPropertyNames(inherit.prototype) : []), true)), true);
        var methods = {};
        for (var _i = 0, allPropertyNames_1 = allPropertyNames; _i < allPropertyNames_1.length; _i++) {
            var key = allPropertyNames_1[_i];
            var fn = target[key];
            if (typeof fn === 'function' && key !== 'constructor' && !exclude.includes(key)) {
                if (util.types.isAsyncFunction(fn)) {
                    var eglWrapFunction = this._proxy(target, key, _implementationType[key]);
                    debug("callbackify async function: ".concat(key));
                    methods[key] = eglWrapFunction;
                }
                else {
                    debug("copy non-async function: ".concat(key));
                    methods[key] = fn;
                }
            }
        }
        debug('callbackify()', methods);
        return methods;
    };
    ServerProxy.prototype._proxy = function (target, key, options) {
        if (options === void 0) { options = {}; }
        var requestStream = options.requestStream, responseStream = options.responseStream;
        var fn = compose(this._middleware);
        // unary
        if (!requestStream && !responseStream) {
            return this._callUnaryProxyMethod(target, key, fn);
        }
        // client stream
        if (requestStream && !responseStream) {
            return this._callClientStreamProxyMethod(target, key, fn);
        }
        // server stream
        if (!requestStream && responseStream) {
            return this._callServerStreamProxyMethod(target, key, fn);
        }
        if (requestStream && responseStream) {
            return this._callDuplexStreamProxyMethod(target, key, fn);
        }
    };
    ServerProxy.prototype._createContext = function (call) {
        return {
            // TODO: maybe need more details
            // method: target.constructor.name + '.' + key,
            path: call.call.handler.path || '',
            request: call.request,
            metadata: call.metadata.clone()
        };
    };
    ServerProxy.prototype._callUnaryProxyMethod = function (target, key, composeFunc) {
        var _this = this;
        return function (call, callback) {
            var ctx = _this._createContext(call);
            Promise.resolve().then(function () { return __awaiter(_this, void 0, void 0, function () {
                var handleResponse;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            handleResponse = function () { return __awaiter(_this, void 0, void 0, function () {
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _a = ctx;
                                            return [4 /*yield*/, target[key](call)];
                                        case 1:
                                            _a.response = _b.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); };
                            return [4 /*yield*/, composeFunc(ctx, handleResponse).catch(function (err) {
                                    callback(_this._createInternalErrorStatus(err));
                                })];
                        case 1:
                            _a.sent();
                            callback(null, ctx.response);
                            return [2 /*return*/];
                    }
                });
            }); });
        };
    };
    ServerProxy.prototype._callClientStreamProxyMethod = function (target, key, composeFunc) {
        var _this = this;
        return function (call, callback) {
            var ctx = _this._createContext(call);
            call.readAll = function () {
                return pEvent.iterator(call, 'data', {
                    resolutionEvents: ['end']
                });
            };
            Promise.resolve().then(function () { return __awaiter(_this, void 0, void 0, function () {
                var handleResponse;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            handleResponse = function () { return __awaiter(_this, void 0, void 0, function () {
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _a = ctx;
                                            return [4 /*yield*/, target[key](call)];
                                        case 1:
                                            _a.response = _b.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); };
                            return [4 /*yield*/, composeFunc(ctx, handleResponse).catch(function (err) {
                                    callback(_this._createInternalErrorStatus(err));
                                })];
                        case 1:
                            _a.sent();
                            callback(null, ctx.response);
                            return [2 /*return*/];
                    }
                });
            }); });
        };
    };
    ServerProxy.prototype._callServerStreamProxyMethod = function (target, key, composeFunc) {
        var _this = this;
        return function (call) {
            var ctx = _this._createContext(call);
            call.writeAll = function (messages) {
                if (Array.isArray(messages)) {
                    messages.forEach(function (message) {
                        call.write(message);
                    });
                }
            };
            call.writeEnd = call.end;
            Promise.resolve().then(function () { return __awaiter(_this, void 0, void 0, function () {
                var handleResponse;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            handleResponse = function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, target[key](call)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); };
                            return [4 /*yield*/, composeFunc(ctx, handleResponse).catch(function (err) {
                                    call.destroy(_this._createInternalErrorStatus(err));
                                })];
                        case 1:
                            _a.sent();
                            call.end();
                            return [2 /*return*/];
                    }
                });
            }); });
        };
    };
    ServerProxy.prototype._callDuplexStreamProxyMethod = function (target, key, composeFunc) {
        var _this = this;
        return function (call) {
            var ctx = _this._createContext(call);
            call.writeAll = function (messages) {
                if (Array.isArray(messages)) {
                    messages.forEach(function (message) {
                        call.write(message);
                    });
                }
            };
            call.readAll = function () {
                return pEvent.iterator(call, 'data', {
                    resolutionEvents: ['end']
                });
            };
            Promise.resolve().then(function () { return __awaiter(_this, void 0, void 0, function () {
                var handleResponse;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            handleResponse = function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, target[key](call)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); };
                            return [4 /*yield*/, composeFunc(ctx, handleResponse).catch(function (err) {
                                    call.destroy(_this._createInternalErrorStatus(err));
                                })];
                        case 1:
                            _a.sent();
                            call.end();
                            return [2 /*return*/];
                    }
                });
            }); });
        };
    };
    ServerProxy.prototype._createInternalErrorStatus = function (err) {
        err.code = err.code || 13;
        if (typeof err.stack === 'string') {
            var stack = err.stack.split('\n');
            err.messages += " [Error Message From Server, stack: ".concat(stack[1].trim(), "]");
        }
        else {
            err.messages += ' [Error Message From Server]';
        }
        return err;
    };
    return ServerProxy;
}());
module.exports = new ServerProxy();
