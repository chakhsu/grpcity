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
var compose = require('koa-compose');
var Joi = require('joi');
var debug = require('debug')('grpcity:serverProxy');
var schemas = {
    listen: Joi.object().keys({
        host: Joi.string().ip().required(),
        port: Joi.number().integer().min(0).max(65535).required()
    })
};
var ServerProxy = /** @class */ (function () {
    function ServerProxy() {
        this._middleware = [];
    }
    ServerProxy.prototype.init = function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!this._server) {
            this._server = new ((_a = grpc.Server).bind.apply(_a, __spreadArray([void 0], args, false)))();
        }
        return this;
    };
    ServerProxy.prototype.listen = function (_a, credentials) {
        var host = _a.host, port = _a.port;
        if (credentials === void 0) { credentials = undefined; }
        return __awaiter(this, void 0, void 0, function () {
            var url, bindPort;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        assert(this._server, 'must be first init() server before server listen()');
                        Joi.assert({ host: host, port: port }, schemas.listen, 'server listen() params Error');
                        debug('server listen options', { host: host, port: port });
                        url = "".concat(host, ":").concat(port);
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                _this._server.bindAsync(url, credentials || _this.makeServerCredentials(), function (err, result) { return (err ? reject(err) : resolve(result)); });
                            })];
                    case 1:
                        bindPort = _b.sent();
                        assert(bindPort === port, 'server bind port not to be right');
                        this._server.start();
                        return [2 /*return*/];
                }
            });
        });
    };
    ServerProxy.prototype.forceShutdown = function () {
        var res = this._server.forceShutdown();
        delete this._server;
        return res;
    };
    ServerProxy.prototype.tryShutdown = function (callback) {
        var res = this._server.tryShutdown(callback);
        delete this._server;
        return res;
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
    ServerProxy.prototype.addService = function (service, implementation) {
        assert(this._server, 'must be first init() server before server addService()');
        this._server.addService(service, implementation);
    };
    // 只支持传入一个方法
    ServerProxy.prototype.addMiddleware = function (fn) {
        if (typeof fn !== 'function')
            throw new TypeError('grpcity loader server middleware must be a function!');
        debug('use %s', fn._name || fn.name || '-');
        this._middleware.push(fn);
    };
    // 支持传入方法数组或者一个方法
    ServerProxy.prototype.addMiddlewares = function (fns) {
        var _this = this;
        if (Array.isArray(fns)) {
            fns.forEach(function (fn) {
                _this.addMiddleware(fn);
            });
        }
        else {
            this.addMiddleware(fns);
        }
    };
    // 洋葱模型：提供 rpc method 中间件前后处理的能力
    ServerProxy.prototype._proxy = function (target, key) {
        var fn = compose(this._middleware);
        return function (call) {
            return __awaiter(this, void 0, void 0, function () {
                var ctx, handleResponse;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            ctx = {
                                // 上下文的补充
                                // TODO: 可能需要更多上下文字段
                                // method: target.constructor.name + '.' + key,
                                path: call.call.handler.path || '',
                                request: call.request
                            };
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
                            return [4 /*yield*/, fn(ctx, handleResponse).catch(function (err) {
                                    if (typeof err.stack === 'string') {
                                        var stack = err.stack.split('\n');
                                        err.message += " [Error Message From Server, stack: ".concat(stack[1].trim(), "]");
                                    }
                                    else {
                                        err.message += ' [Error Message From Server]';
                                    }
                                    throw new Error(err);
                                })];
                        case 1:
                            _a.sent();
                            debug(key, JSON.stringify(ctx));
                            return [2 /*return*/, ctx.response];
                    }
                });
            });
        };
    };
    return ServerProxy;
}());
module.exports = new ServerProxy();
