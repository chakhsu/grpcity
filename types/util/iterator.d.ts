declare function _exports(emitter: any, event: any, options: any): {
    [Symbol.asyncIterator](): {
        [Symbol.asyncIterator](): any;
        next(): Promise<{
            done: boolean;
            value: undefined;
        }>;
    };
    next(): Promise<{
        done: boolean;
        value: undefined;
    }>;
    return?: undefined;
} | {
    [x: symbol]: () => {
        [x: symbol]: any;
        next(): Promise<any>;
        return(value: any): Promise<{
            done: boolean;
            value: any;
        }>;
    };
    next(): Promise<any>;
    return(value: any): Promise<{
        done: boolean;
        value: any;
    }>;
    [Symbol.asyncIterator]?: undefined;
};
export = _exports;
