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
var Metadata = require('@grpc/grpc-js').Metadata;
var os = require('os');
var pEvent = require('p-event');
var debug = require('debug')('grpcity:clientProxy');
var ClientProxy = /** @class */ (function () {
    function ClientProxy() {
    }
    ClientProxy.prototype.proxy = function (client, defaultOptions, appName) {
        var _this = this;
        if (defaultOptions === void 0) { defaultOptions = {}; }
        if (appName === void 0) { appName = undefined; }
        defaultOptions = defaultOptions || {};
        defaultOptions.timeout = defaultOptions.timeout || 1000 * 10;
        var prototype = Object.getPrototypeOf(client);
        var methodNames = Object.keys(prototype)
            .filter(function (key) { return prototype[key] && prototype[key].path; })
            .reduce(function (names, key) {
            names[key.toUpperCase()] = prototype[key].path;
            return names;
        }, {});
        var basicMeta = { hostname: os.hostname(), appName: appName };
        var target = Object.entries(prototype).filter(function (_a) {
            var name = _a[0], func = _a[1];
            return name !== 'constructor' && typeof func === 'function';
        }).reduce(function (target, _a) {
            var name = _a[0], func = _a[1];
            basicMeta.fullServiceName = "".concat(methodNames[name.toUpperCase()]);
            debug('proxy method', basicMeta);
            var _b = _this._getFuncStreamWay(func), requestStream = _b.requestStream, responseStream = _b.responseStream;
            if (!requestStream && !responseStream) {
                // promisify unary method
                target[name] = _this._promisifyUnaryMethod(client, func, defaultOptions, basicMeta);
            }
            // stream
            if (requestStream && !responseStream) {
                // promisify only client stream method
                target.stream[name] = _this._promisifyClientStreamMethod(client, func, defaultOptions, basicMeta);
            }
            if (!requestStream && responseStream) {
                // promisify only server stream method
                target.stream[name] = _this._promisifyServerStreamMethod(client, func, defaultOptions, basicMeta);
            }
            if (requestStream && responseStream) {
                target.stream[name] = _this._promisifyDuplexStreamMethod(client, func, defaultOptions, basicMeta);
            }
            // keep callback method
            target.call[name] = _this._keepCallbackMethod(client, func);
            return target;
        }, { stream: {}, call: {} });
        return target;
    };
    ClientProxy.prototype._getFuncStreamWay = function (func) {
        var requestStream = func.requestStream, responseStream = func.responseStream;
        return { requestStream: requestStream, responseStream: responseStream };
    };
    ClientProxy.prototype._promisifyUnaryMethod = function (client, func, defaultOptions, basicMeta) {
        var _this = this;
        var asyncUnaryMethod = function (request, metadata, options) { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            var _this = this;
            return __generator(this, function (_b) {
                if (typeof options === 'function') {
                    throw new Error('gRPCity: AsyncFunction should not contain callback function');
                }
                else if (typeof metadata === 'function') {
                    throw new Error('gRPCity: AsyncFunction should not contain callback function');
                }
                _a = this._prepareMetadata(metadata, options, basicMeta), metadata = _a[0], options = _a[1];
                options = this._setDeadline(options, defaultOptions, basicMeta);
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var result = {};
                        var argumentsList = [request, metadata, options];
                        argumentsList.push(function (err, response) {
                            if (err) {
                                reject(_this._handlerError(err, basicMeta));
                            }
                            debug('unaryMethod get response', response);
                            result.response = response;
                        });
                        var call = func.apply(client, argumentsList);
                        call.on('metadata', function (metadata) {
                            debug('unaryMethod get metadata', metadata);
                            result.metadata = metadata;
                        });
                        call.on('status', function (status) {
                            debug('unaryMethod get status', status);
                            result.status = status;
                            resolve(result);
                        });
                    })];
            });
        }); };
        return asyncUnaryMethod;
    };
    ClientProxy.prototype._promisifyClientStreamMethod = function (client, func, defaultOptions, basicMeta) {
        var _this = this;
        var clientStreamMethod = function (metadata, options) {
            var _a;
            if (typeof options === 'function') {
                throw new Error('gRPCity: asyncStreamFunction should not contain callback function');
            }
            else if (typeof metadata === 'function') {
                throw new Error('gRPCity: asyncStreamFunction should not contain callback function');
            }
            _a = _this._prepareMetadata(metadata, options, basicMeta), metadata = _a[0], options = _a[1];
            options = _this._setDeadline(options, defaultOptions, basicMeta);
            var result = {};
            var argumentsList = [metadata, options];
            argumentsList.push(function (err, response) {
                if (err) {
                    throw _this._handlerError(err, basicMeta);
                }
                debug('clientStreamMethod get response', response);
                result.response = response;
            });
            var call = func.apply(client, argumentsList);
            call.writeAll = function (messages) {
                if (Array.isArray(messages)) {
                    messages.forEach(function (message) {
                        call.write(message);
                    });
                }
            };
            call.writeEnd = function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            call.end();
                            return [4 /*yield*/, new Promise(function (resolve, reject) {
                                    call.on('metadata', function (metadata) {
                                        debug('clientStreamMethod get metadata', metadata);
                                        result.metadata = metadata;
                                    });
                                    call.on('status', function (status) {
                                        debug('clientStreamMethod get status', status);
                                        result.status = status;
                                        resolve();
                                    });
                                })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, result];
                    }
                });
            }); };
            return call;
        };
        return clientStreamMethod;
    };
    ClientProxy.prototype._promisifyServerStreamMethod = function (client, func, defaultOptions, basicMeta) {
        var _this = this;
        var serverStreamMethod = function (request, metadata, options) {
            var _a;
            if (typeof options === 'function') {
                throw new Error('gRPCity: asyncStreamFunction should not contain callback function');
            }
            else if (typeof metadata === 'function') {
                throw new Error('gRPCity: asyncStreamFunction should not contain callback function');
            }
            _a = _this._prepareMetadata(metadata, options, basicMeta), metadata = _a[0], options = _a[1];
            options = _this._setDeadline(options, defaultOptions, basicMeta);
            var call = func.apply(client, [request, metadata, options]);
            call.readAll = function () { return __awaiter(_this, void 0, void 0, function () {
                var result;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            result = {};
                            return [4 /*yield*/, new Promise(function (resolve, reject) {
                                    call.on('error', function (err) {
                                        reject(_this._handlerError(err, basicMeta));
                                    });
                                    result.response = pEvent.iterator(call, 'data', {
                                        resolutionEvents: ['status', 'end']
                                    });
                                    call.on('metadata', function (metadata) {
                                        debug('serverStreamMethod get metadata', metadata);
                                        result.metadata = metadata;
                                    });
                                    call.on('status', function (status) {
                                        debug('serverStreamMethod get status', status);
                                        result.status = status;
                                        resolve();
                                    });
                                })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, result];
                    }
                });
            }); };
            return call;
        };
        return serverStreamMethod;
    };
    ClientProxy.prototype._promisifyDuplexStreamMethod = function (client, func, defaultOptions, basicMeta) {
        var _this = this;
        var duplexStreamMethod = function (metadata, options) {
            var _a;
            if (typeof options === 'function') {
                throw new Error('gRPCity: asyncStreamFunction should not contain callback function');
            }
            else if (typeof metadata === 'function') {
                throw new Error('gRPCity: asyncStreamFunction should not contain callback function');
            }
            _a = _this._prepareMetadata(metadata, options, basicMeta), metadata = _a[0], options = _a[1];
            options = _this._setDeadline(options, defaultOptions, basicMeta);
            var call = func.apply(client, [metadata, options]);
            call.writeAll = function (messages) {
                if (Array.isArray(messages)) {
                    messages.forEach(function (message) {
                        call.write(message);
                    });
                }
            };
            call.writeEnd = call.end;
            call.readAll = function () { return __awaiter(_this, void 0, void 0, function () {
                var result;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            call.end();
                            result = {};
                            return [4 /*yield*/, new Promise(function (resolve, reject) {
                                    call.on('error', function (err) {
                                        reject(_this._handlerError(err, basicMeta));
                                    });
                                    result.response = pEvent.iterator(call, 'data', {
                                        resolutionEvents: ['status', 'end']
                                    });
                                    call.on('metadata', function (metadata) {
                                        debug('serverStreamMethod get metadata', metadata);
                                        result.metadata = metadata;
                                    });
                                    call.on('status', function (status) {
                                        debug('serverStreamMethod get status', status);
                                        result.status = status;
                                        resolve();
                                    });
                                })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, result];
                    }
                });
            }); };
            return call;
        };
        return duplexStreamMethod;
    };
    ClientProxy.prototype._keepCallbackMethod = function (client, func) {
        var callbackMethod = function () {
            var argumentsList = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                argumentsList[_i] = arguments[_i];
            }
            return func.apply(client, argumentsList);
        };
        return callbackMethod;
    };
    ClientProxy.prototype._prepareMetadata = function (metadata, options, basicMeta) {
        if (metadata instanceof Metadata) {
            options = Object.assign({}, options);
        }
        else {
            options = Object.assign({}, metadata);
            metadata = new Metadata();
        }
        metadata.add('x-client-hostname', basicMeta.hostname);
        if (basicMeta.appName) {
            metadata.add('x-client-app-name', basicMeta.appName);
        }
        return [metadata, options];
    };
    ClientProxy.prototype._handlerError = function (err, basicMeta) {
        var newError = new Error();
        newError.name = 'GrpcClientError';
        newError.code = err.code;
        newError.message = "".concat(basicMeta.fullServiceName, " (").concat(err.message, ")");
        var stacks = newError.stack.split('\n');
        newError.stack = __spreadArray(__spreadArray(__spreadArray([
            stacks[0]
        ], stacks.slice(2), true), [
            '    ...'
        ], false), err.stack.split('\n').slice(1, 3), true).join('\n');
        return newError;
    };
    ClientProxy.prototype._setDeadline = function (options, defaultOptions, basicMeta) {
        if (!options.deadline) {
            var timeout = options.timeout || defaultOptions.timeout;
            var deadline = new Date(Date.now() + timeout);
            options.deadline = deadline;
            delete options.timeout;
            debug('grpc client request will timeout at', { fullServiceName: basicMeta.fullServiceName, deadline: deadline });
        }
        return options;
    };
    return ClientProxy;
}());
module.exports = new ClientProxy();
