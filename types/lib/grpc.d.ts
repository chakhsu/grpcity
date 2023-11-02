export = GrpcLoader;
declare class GrpcLoader {
    constructor(protoFileOptions: any);
    _protoFiles: any[];
    _clientMap: Map<any, any>;
    _clientAddrMap: Map<any, any>;
    init({ services, isDev, packagePrefix, loadOptions, channelOptions, appName }?: {
        services?: any;
        isDev?: boolean;
        packagePrefix?: string;
        loadOptions?: {};
        channelOptions?: {};
        appName: any;
    }): Promise<void>;
    _isDev: boolean;
    _packagePrefix: string;
    _appName: any;
    _packageDefinition: any;
    _types: grpc.GrpcObject;
    initClients({ services, channelOptions, credentials }: {
        services: any;
        channelOptions?: {};
        credentials?: any;
    }): Promise<void>;
    _initDefaultClient: boolean;
    makeCredentials(rootCerts: any, privateKey: any, certChain: any, verifyOptions: any): grpc.ChannelCredentials;
    _insecureCredentials: grpc.ChannelCredentials;
    service(name: any): any;
    type(name: any): any;
    message(name: any): any;
    _reflectedRoot: any;
    client(name: any, { host, port, timeout, credentials, channelOptions }?: {
        host?: any;
        port?: any;
        timeout?: any;
        credentials?: any;
        channelOptions?: {};
    }): any;
    realClient(name: any, { host, port, credentials, channelOptions }?: {
        host?: any;
        port?: any;
        credentials?: any;
        channelOptions?: {};
    }): any;
    clientWithoutCache(name: any, { addr, timeout, credentials, channelOptions }?: {
        addr: any;
        timeout?: any;
        credentials?: any;
        channelOptions?: {};
    }): {
        stream: {};
        call: {};
    };
    _makeClient(isDefaultClient: any, name: any, addr: any, credentials: any, channelOptions?: {}): any;
    _makeClientWithoutCache(isDefaultClient: any, name: any, addr: any, credentials: any, channelOptions?: {}): any;
    makeMetadata(initialValues: any): grpc.Metadata;
    initServer(...args: any[]): {
        _middleware: any[];
        _init(...args: any[]): any;
        _server: grpc.Server;
        listen(addr: any, credentials?: any): Promise<void>;
        shutdown(): Promise<void>;
        forceShutdown(): void;
        makeServerCredentials(rootCerts: any, keyCertPairs: any, checkClientCertificate: any): grpc.ServerCredentials;
        _insecureServerCredentials: grpc.ServerCredentials;
        addService(service: any, implementation: any): void;
        removeService(service: any): void;
        addMiddleware(fn: any): void;
        addMiddlewares(fns: any): void;
        _proxy(target: any, key: any): (call: any) => Promise<any>;
    };
    callbackify(target: any, { exclude, inherit }?: {
        exclude?: any[];
        inherit: any;
    }): {};
}
import grpc = require("@grpc/grpc-js");
