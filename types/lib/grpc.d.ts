export = GrpcLoader;
declare class GrpcLoader {
    constructor(protoFileOptions: any);
    _protoFiles: any[];
    _clientMap: Map<any, any>;
    _clientAddrMap: Map<any, any>;
    init({ services, isDev, packagePrefix, loadOptions, channelOptions, appName }?: {
        services?: undefined;
        isDev?: boolean | undefined;
        packagePrefix?: string | undefined;
        loadOptions?: {} | undefined;
        channelOptions?: {} | undefined;
        appName: any;
    }): Promise<void>;
    _isDev: boolean | undefined;
    _packagePrefix: string | undefined;
    _appName: any;
    _packageDefinition: any;
    _types: grpc.GrpcObject | undefined;
    initClients({ services, channelOptions, credentials }: {
        services: any;
        channelOptions?: {} | undefined;
        credentials?: undefined;
    }): Promise<void>;
    _initDefaultClient: boolean | undefined;
    closeClients(): void;
    makeCredentials(rootCerts: any, privateKey: any, certChain: any, verifyOptions: any): grpc.ChannelCredentials;
    _insecureCredentials: grpc.ChannelCredentials | undefined;
    service(name: any): any;
    type(name: any): any;
    message(name: any): any;
    _reflectedRoot: any;
    client(name: any, { host, port, timeout, credentials, channelOptions }?: {
        host?: undefined;
        port?: undefined;
        timeout?: undefined;
        credentials?: undefined;
        channelOptions?: {} | undefined;
    }): any;
    realClient(name: any, { host, port, credentials, channelOptions }?: {
        host?: undefined;
        port?: undefined;
        credentials?: undefined;
        channelOptions?: {} | undefined;
    }): any;
    clientWithoutCache(name: any, { addr, timeout, credentials, channelOptions }?: {
        addr: any;
        timeout?: undefined;
        credentials?: undefined;
        channelOptions?: {} | undefined;
    }): {
        call: {};
    };
    _makeClient(isDefaultClient: any, name: any, addr: any, credentials: any, channelOptions?: {}): any;
    _makeClientWithoutCache(isDefaultClient: any, name: any, addr: any, credentials: any, channelOptions?: {}): any;
    makeMetadata(initialValues: any): grpc.Metadata;
    initServer(...args: any[]): {
        _middleware: any[];
        _init(loader: any, ...args: any[]): any;
        _loader: any;
        _server: grpc.Server | undefined;
        listen(addr: any, credentials?: undefined): Promise<void>;
        shutdown(): Promise<void>;
        forceShutdown(): void;
        makeServerCredentials(rootCerts: any, keyCertPairs: any, checkClientCertificate: any): grpc.ServerCredentials;
        _insecureServerCredentials: grpc.ServerCredentials | undefined;
        addService(name: any, implementation: any, { exclude, inherit }?: {
            exclude?: any[] | undefined;
            inherit: any;
        }): void;
        removeService(name: any): void;
        addMiddleware(...args: any[]): void;
        _use(fn: any): void;
        _callbackify(target: any, { exclude, inherit, _implementationType }?: {
            exclude?: any[] | undefined;
            inherit: any;
            _implementationType: any;
        }): {};
        _proxy(target: any, key: any, options?: {}): ((call: any, callback: any) => void) | undefined;
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
    };
}
import grpc = require("@grpc/grpc-js");
