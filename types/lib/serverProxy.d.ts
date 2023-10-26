declare const _exports: ServerProxy;
export = _exports;
declare class ServerProxy {
    _middleware: any[];
    init(...args: any[]): this;
    _server: grpc.Server;
    listen(addr: any, credentials?: any): Promise<void>;
    forceShutdown(): void;
    tryShutdown(callback: any): void;
    makeServerCredentials(rootCerts: any, keyCertPairs: any, checkClientCertificate: any): grpc.ServerCredentials;
    _insecureServerCredentials: grpc.ServerCredentials;
    addService(service: any, implementation: any): void;
    addMiddleware(fn: any): void;
    addMiddlewares(fns: any): void;
    _proxy(target: any, key: any): (call: any) => Promise<any>;
}
import grpc = require("@grpc/grpc-js");
