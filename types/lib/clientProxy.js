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
var debug = require('debug')('grpcity:clientProxy');
var ClientProxy = /** @class */ (function () {
    function ClientProxy() {
    }
    ClientProxy.prototype.proxy = function (client, defaultOptions, appName) {
        if (defaultOptions === void 0) { defaultOptions = {}; }
        if (appName === void 0) { appName = undefined; }
        defaultOptions = defaultOptions || {};
        defaultOptions.timeout = defaultOptions.timeout || 1000 * 10;
        var hostname = os.hostname();
        var prototype = Object.getPrototypeOf(client);
        var methodNames = Object.keys(prototype).reduce(function (names, key) {
            if (prototype[key] && prototype[key].path) {
                names[key.toUpperCase()] = prototype[key].path;
            }
            return names;
        }, {});
        var target = Object.entries(prototype).filter(function (_a) {
            var name = _a[0], func = _a[1];
            return name !== 'constructor' && typeof func === 'function';
        }).reduce(function (target, _a) {
            var name = _a[0], func = _a[1];
            var fullServiceName = "".concat(methodNames[name.toUpperCase()]);
            debug('proxy method', fullServiceName);
            var asyncFunc = function (request, metadata, options) {
                return __awaiter(this, void 0, void 0, function () {
                    var timeout, deadline, outSideError;
                    return __generator(this, function (_a) {
                        if (typeof options === 'function') {
                            throw new Error('EasyGrpcLoader: AsyncFunction should not contain callback function');
                        }
                        else if (typeof metadata === 'function') {
                            throw new Error('EasyGrpcLoader: AsyncFunction should not contain callback function');
                        }
                        if (metadata instanceof Metadata) {
                            options = Object.assign({}, options);
                        }
                        else {
                            options = Object.assign({}, metadata);
                            metadata = new Metadata();
                        }
                        metadata.add('x-client-hostname', hostname);
                        if (appName) {
                            metadata.add('x-client-app-name', appName);
                        }
                        if (!options.deadline) {
                            timeout = options.timeout || defaultOptions.timeout;
                            deadline = new Date(Date.now() + timeout);
                            options.deadline = deadline;
                            delete options.timeout;
                            debug('grpc client request will timeout at', { fullServiceName: fullServiceName, deadline: deadline });
                        }
                        outSideError = new Error();
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                var argumentsList = [request, metadata, options];
                                argumentsList.push(function (err, response) {
                                    if (err) {
                                        outSideError.name = 'GrpcClientError';
                                        outSideError.code = err.code;
                                        outSideError.message = "".concat(fullServiceName, " (").concat(err.message, ")");
                                        var stacks = outSideError.stack.split('\n');
                                        outSideError.stack = __spreadArray(__spreadArray(__spreadArray([
                                            stacks[0]
                                        ], stacks.slice(2), true), [
                                            '    ...'
                                        ], false), err.stack.split('\n').slice(1, 3), true).join('\n');
                                        reject(outSideError);
                                    }
                                    resolve(response);
                                });
                                func.apply(client, argumentsList);
                            })];
                    });
                });
            };
            // 原方法放到 original 里
            if (!target.original) {
                target.original = {};
            }
            target.original[name] = function () {
                var argumentsList = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    argumentsList[_i] = arguments[_i];
                }
                return func.apply(client, argumentsList);
            };
            target[name] = asyncFunc;
            return target;
        }, { async: {} });
        return target;
    };
    return ClientProxy;
}());
module.exports = new ClientProxy();
