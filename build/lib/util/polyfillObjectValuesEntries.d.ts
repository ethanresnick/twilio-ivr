declare const reduce: any;
declare const isEnumerable: any;
declare const concat: any;
declare const keys: typeof Reflect.ownKeys;
interface ObjectConstructor {
    values<T>(o: {
        [s: string]: T;
    }): T[];
    values(o: any): any[];
    entries<T>(o: {
        [s: string]: T;
    }): [string, T][];
    entries(o: any): [string, any][];
}
