const reduce = Function.bind.call(Function.call, Array.prototype.reduce);
const isEnumerable = Function.bind.call(Function.call, Object.prototype.propertyIsEnumerable);
const concat = Function.bind.call(Function.call, Array.prototype.concat);
const keys = Reflect.ownKeys;

export function entries<T>(o: { [s: string]: T }): [string, T][] {
  return reduce(keys(o), (e: [string, any][], k: PropertyKey) => {
    return concat(e, typeof k === 'string' && isEnumerable(o, k) ? [[k, o[k]]] : [])
  }, []);
};

export function values<T>(o: { [key: string]: T }): T[] {
  return reduce(keys(o), (v: any[], k: PropertyKey) => {
    return concat(v, typeof k === 'string' && isEnumerable(o, k) ? [o[k]] : [])
  }, []);
};
