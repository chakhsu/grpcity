declare const _exports: ClientProxy;
export = _exports;
declare class ClientProxy {
    proxy(client: any, defaultOptions?: {}, appName?: any): {
        stream: {};
        call: {};
    };
    _getFuncStreamWay(func: any): {
        requestStream: any;
        responseStream: any;
    };
    _promisifyUnaryMethod(client: any, func: any, defaultOptions: any, basicMeta: any): (request: any, metadata: any, options: any) => Promise<any>;
    _promisifyClientStreamMethod(client: any, func: any, defaultOptions: any, basicMeta: any): (metadata: any, options: any) => any;
    _promisifyServerStreamMethod(client: any, func: any, defaultOptions: any, basicMeta: any): (request: any, metadata: any, options: any) => any;
    _promisifyDuplexStreamMethod(client: any, func: any, defaultOptions: any, basicMeta: any): (metadata: any, options: any) => any;
    _keepCallbackMethod(client: any, func: any): (...argumentsList: any[]) => any;
}
