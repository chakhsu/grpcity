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
const grpc_js_1 = require("@grpc/grpc-js");
const os = __importStar(require("node:os"));
const iterator_1 = __importDefault(require("../util/iterator"));
class ClientProxy {
    _getFuncStreamWay(func) {
        const { requestStream, responseStream } = func;
        return { requestStream, responseStream };
    }
    _prepareMetadata(metadata, options, basicMeta) {
        if (metadata instanceof grpc_js_1.Metadata) {
            options = { ...options };
        }
        else {
            options = { ...metadata };
            metadata = new grpc_js_1.Metadata();
        }
        if (basicMeta.hostname) {
            metadata.add('x-client-hostname', basicMeta.hostname);
        }
        if (basicMeta.appName) {
            metadata.add('x-client-app-name', basicMeta.appName);
        }
        return [metadata, options];
    }
    _handlerError(err, basicMeta) {
        const newError = new Error();
        newError.name = 'GrpcClientError';
        newError.code = err.code;
        newError.message = `${basicMeta.fullServiceName} (${err.message})`;
        const stacks = newError.stack.split('\n');
        newError.stack = [
            stacks[0],
            ...stacks.slice(2),
            '    ...',
            ...err.stack.split('\n').slice(1, 3),
        ].join('\n');
        return newError;
    }
    _setDeadline(options, defaultOptions, basicMeta) {
        if (!options.deadline) {
            const timeout = options.timeout || defaultOptions.timeout;
            const deadline = new Date(Date.now() + timeout);
            options.deadline = deadline;
            delete options.timeout;
        }
        return options;
    }
    _promisifyUnaryMethod(client, func, defaultOptions, basicMeta) {
        const asyncUnaryMethod = async (request, metadata, options) => {
            if (typeof options === 'function') {
                throw new Error('gRPCity: AsyncFunction should not contain a callback function');
            }
            else if (typeof metadata === 'function') {
                throw new Error('gRPCity: AsyncFunction should not contain a callback function');
            }
            [metadata, options] = this._prepareMetadata(metadata, options, basicMeta);
            options = this._setDeadline(options, defaultOptions, basicMeta);
            return new Promise((resolve, reject) => {
                const result = {};
                const argumentsList = [request, metadata, options];
                argumentsList.push((err, response) => {
                    if (err) {
                        reject(this._handlerError(err, basicMeta));
                    }
                    result.response = response;
                });
                const call = func.apply(client, argumentsList);
                call.on('metadata', (metadata) => {
                    result.metadata = metadata;
                });
                call.on('status', (status) => {
                    result.status = status;
                    resolve(result);
                });
            });
        };
        return asyncUnaryMethod;
    }
    _promisifyClientStreamMethod(client, func, defaultOptions, basicMeta) {
        const clientStreamMethod = (metadata, options) => {
            if (typeof options === 'function') {
                throw new Error('gRPCity: asyncStreamFunction should not contain a callback function');
            }
            else if (typeof metadata === 'function') {
                throw new Error('gRPCity: asyncStreamFunction should not contain a callback function');
            }
            [metadata, options] = this._prepareMetadata(metadata, options, basicMeta);
            options = this._setDeadline(options, defaultOptions, basicMeta);
            const result = {};
            const argumentsList = [metadata, options];
            argumentsList.push((err, response) => {
                if (err) {
                    throw this._handlerError(err, basicMeta);
                }
                result.response = response;
            });
            const call = func.apply(client, argumentsList);
            call.writeAll = (messages) => {
                if (Array.isArray(messages)) {
                    messages.forEach((message) => {
                        call.write(message);
                    });
                }
            };
            call.writeEnd = async () => {
                call.end();
                await new Promise((resolve, reject) => {
                    call.on('metadata', (metadata) => {
                        result.metadata = metadata;
                    });
                    call.on('status', (status) => {
                        result.status = status;
                        resolve();
                    });
                });
                return result;
            };
            return call;
        };
        return clientStreamMethod;
    }
    _promisifyServerStreamMethod(client, func, defaultOptions, basicMeta) {
        const serverStreamMethod = (request, metadata, options) => {
            if (typeof options === 'function') {
                throw new Error('gRPCity: asyncStreamFunction should not contain a callback function');
            }
            else if (typeof metadata === 'function') {
                throw new Error('gRPCity: asyncStreamFunction should not contain a callback function');
            }
            [metadata, options] = this._prepareMetadata(metadata, options, basicMeta);
            options = this._setDeadline(options, defaultOptions, basicMeta);
            const call = func.apply(client, [request, metadata, options]);
            call.on('error', (err) => {
                throw this._handlerError(err, basicMeta);
            });
            const result = {};
            call.readAll = () => {
                call.on('metadata', (metadata) => {
                    result.metadata = metadata;
                });
                call.on('status', (status) => {
                    result.status = status;
                });
                return (0, iterator_1.default)(call, 'data', {
                    resolutionEvents: ['status', 'end'],
                });
            };
            call.readEnd = () => {
                return result;
            };
            return call;
        };
        return serverStreamMethod;
    }
    _promisifyDuplexStreamMethod(client, func, defaultOptions, basicMeta) {
        const duplexStreamMethod = (metadata, options) => {
            if (typeof options === 'function') {
                throw new Error('gRPCity: asyncStreamFunction should not contain a callback function');
            }
            else if (typeof metadata === 'function') {
                throw new Error('gRPCity: asyncStreamFunction should not contain a callback function');
            }
            [metadata, options] = this._prepareMetadata(metadata, options, basicMeta);
            options = this._setDeadline(options, defaultOptions, basicMeta);
            const call = func.apply(client, [metadata, options]);
            call.writeAll = (messages) => {
                if (Array.isArray(messages)) {
                    messages.forEach((message) => {
                        call.write(message);
                    });
                }
            };
            call.writeEnd = call.end;
            call.on('error', (err) => {
                throw this._handlerError(err, basicMeta);
            });
            const result = {};
            call.readAll = () => {
                call.on('metadata', (metadata) => {
                    result.metadata = metadata;
                });
                call.on('status', (status) => {
                    result.status = status;
                });
                return (0, iterator_1.default)(call, 'data', {
                    resolutionEvents: ['status', 'end'],
                });
            };
            call.readEnd = () => {
                return result;
            };
            return call;
        };
        return duplexStreamMethod;
    }
    _keepCallbackMethod(client, func) {
        const callbackMethod = (...argumentsList) => {
            return func.apply(client, argumentsList);
        };
        return callbackMethod;
    }
    _proxy(client, defaultOptions = {}, appName) {
        defaultOptions = defaultOptions || {};
        defaultOptions.timeout = defaultOptions.timeout || 1000 * 10;
        const prototype = Object.getPrototypeOf(client);
        const methodNames = Object.keys(prototype)
            .filter((key) => prototype[key] && prototype[key].path)
            .reduce((names, key) => {
            names[key.toUpperCase()] = prototype[key].path;
            return names;
        }, {});
        const basicMeta = { hostname: os.hostname(), appName };
        const target = Object.entries(prototype).reduce((target, [name, func]) => {
            if (name !== 'constructor' && typeof func === 'function') {
                basicMeta.fullServiceName = `${methodNames[name.toUpperCase()]}`;
                const { requestStream, responseStream } = this._getFuncStreamWay(func);
                if (!requestStream && !responseStream) {
                    // promisify unary method
                    target[name] = this._promisifyUnaryMethod(client, func, defaultOptions, basicMeta);
                }
                // stream
                if (requestStream && !responseStream) {
                    // promisify only client stream method
                    target[name] = this._promisifyClientStreamMethod(client, func, defaultOptions, basicMeta);
                }
                if (!requestStream && responseStream) {
                    // promisify only server stream method
                    target[name] = this._promisifyServerStreamMethod(client, func, defaultOptions, basicMeta);
                }
                if (requestStream && responseStream) {
                    // promisify duplex stream method
                    target[name] = this._promisifyDuplexStreamMethod(client, func, defaultOptions, basicMeta);
                }
                // keep callback method
                target.call[name] = this._keepCallbackMethod(client, func);
            }
            return target;
        }, { call: {} });
        return target;
    }
}
exports.default = new ClientProxy();
