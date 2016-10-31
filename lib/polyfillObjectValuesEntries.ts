const reduce = Function.bind.call(Function.call, Array.prototype.reduce);
const isEnumerable = Function.bind.call(Function.call, Object.prototype.propertyIsEnumerable);
const concat = Function.bind.call(Function.call, Array.prototype.concat);
const keys = Reflect.ownKeys;

interface ObjectConstructor {
  values<T>(o: { [s: string]: T }): T[];
  values(o: any): any[];

  entries<T>(o: { [s: string]: T }): [string, T][];
  entries(o: any): [string, any][];
}

if (!Object.values) {
  Object.values = function values(O: { [key: string]: any }) {
    return reduce(keys(O), (v: any[], k: PropertyKey) => {
      return concat(v, typeof k === 'string' && isEnumerable(O, k) ? [O[k]] : [])
    }, []);
  };
}

if (!Object.entries) {
  Object.entries = function entries(O: { [key: string]: any }) {
    return reduce(keys(O), (e: [string, any][], k: PropertyKey) => {
      return concat(e, typeof k === 'string' && isEnumerable(O, k) ? [[k, O[k]]] : [])
    }, []);
  };
}
