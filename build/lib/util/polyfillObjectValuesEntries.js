const reduce = Function.bind.call(Function.call, Array.prototype.reduce);
const isEnumerable = Function.bind.call(Function.call, Object.prototype.propertyIsEnumerable);
const concat = Function.bind.call(Function.call, Array.prototype.concat);
const keys = Reflect.ownKeys;
if (!Object.values) {
    Object.values = function values(O) {
        return reduce(keys(O), (v, k) => {
            return concat(v, typeof k === 'string' && isEnumerable(O, k) ? [O[k]] : []);
        }, []);
    };
}
if (!Object.entries) {
    Object.entries = function entries(O) {
        return reduce(keys(O), (e, k) => {
            return concat(e, typeof k === 'string' && isEnumerable(O, k) ? [[k, O[k]]] : []);
        }, []);
    };
}
