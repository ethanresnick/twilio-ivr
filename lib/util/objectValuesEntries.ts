const reduce = Function.bind.call(Function.call, Array.prototype.reduce);
const isEnumerable = Function.bind.call(Function.call, Object.prototype.propertyIsEnumerable);
const concat = Function.bind.call(Function.call, Array.prototype.concat);
const keys = Reflect.ownKeys;

export function entries<T>(o: { [s: string]: T }): [string, T][] {
  return reduce(keys(O), (e: [string, any][], k: PropertyKey) => {
    return concat(e, typeof k === 'string' && isEnumerable(O, k) ? [[k, O[k]]] : [])
  }, []);
};

export function values<T>(O: { [key: string]: T }): T[] {
  return reduce(keys(O), (v: any[], k: PropertyKey) => {
    return concat(v, typeof k === 'string' && isEnumerable(O, k) ? [O[k]] : [])
  }, []);
};
