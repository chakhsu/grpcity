declare const _exports: ServerProxy;
export = _exports;
declare class ServerProxy {
    _middleware: any[];
    _init(loader: any, ...args: any[]): this;
    _loader: any;
    _server: grpc.Server;
    listen(addr: any, credentials?: any): Promise<void>;
    shutdown(): Promise<void>;
    forceShutdown(): void;
    makeServerCredentials(rootCerts: any, keyCertPairs: any, checkClientCertificate: any): grpc.ServerCredentials;
    _insecureServerCredentials: grpc.ServerCredentials;
    addService(name: any, implementation: any, { exclude, inherit }?: {
        exclude?: any[];
        inherit: any;
    }): void;
    removeService(name: any): void;
    addMiddleware(...args: any[]): void;
    _use(fn: any): void;
    _callbackify(target: any, { exclude, inherit, _implementationType }?: {
        exclude?: any[];
        inherit: any;
        _implementationType: any;
    }): {};
    _proxy(target: any, key: any, options?: {}): (call: any, callback: any) => void;
    _createContext(call: any): {
        path: any;
        request: any;
        metadata: any;
    };
    _callUnaryProxyMethod(target: any, key: any, composeFunc: any): (call: any, callback: any) => void;
    _callClientStreamProxyMethod(target: any, key: any, composeFunc: any): (call: any, callback: any) => void;
    _callServerStreamProxyMethod(target: any, key: any, composeFunc: any): (call: any) => void;
    _callDuplexStreamProxyMethod(target: any, key: any, composeFunc: any): (call: any) => void;
    _createInternalErrorStatus(err: any): any;
}
import grpc = require("@grpc/grpc-js");
