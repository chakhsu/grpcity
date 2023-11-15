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
    _callbackify(target: any, { exclude, inherit, _implementationType }?: {
        exclude?: any[];
        inherit: any;
        _implementationType: any;
    }): {};
    removeService(service: any): void;
    addMiddleware(fn: any): void;
    addMiddlewares(fns: any): void;
    _proxy(target: any, key: any, options: any): (call: any) => Promise<any>;
}
import grpc = require("@grpc/grpc-js");
