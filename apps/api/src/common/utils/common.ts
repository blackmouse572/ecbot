/**
 * Type guard to check if the provided object has a `toObject` method.
 *
 * @param obj - The object to check.
 * @returns True if `obj` has a `toObject` method, otherwise false.
 *
 * @example
 * class MyClass {
 *   toObject() {
 *     return { foo: 'bar' };
 *   }
 * }
 * const instance = new MyClass();
 * if (hasToObject(instance)) {
 *   // TypeScript knows instance has toObject()
 *   const obj = instance.toObject();
 * }
 */
export function hasToObject(obj: any): obj is { toObject: () => object } {
    return typeof obj?.toObject === 'function';
}

/**
 * Get the difference between two objects.
 *
 * @param origin - The original object.
 * @param target - The target object.
 * @returns An object containing the differences between the two objects.
 */
export function getDiffObject(
    origin: any,
    target: any
): { old: any; new: any } {
    const oldObject = {};
    const newObject = {};

    function isEqual(a: any, b: any): boolean {
        if (a === b) return true;
        if (typeof a !== typeof b) return false;
        if (typeof a !== 'object' || a === null || b === null) return false;
        if (Array.isArray(a) !== Array.isArray(b)) return false;
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        for (const key of aKeys) {
            if (!bKeys.includes(key) || !isEqual(a[key], b[key])) return false;
        }
        return true;
    }

    for (const key in origin) {
        if (!isEqual(origin[key], target[key])) {
            oldObject[key] = origin[key];
            newObject[key] = target[key];
        }
    }

    return { old: oldObject, new: newObject };
}

/**
 * Build a new object with exactly the given keys copied from `source`,
 * regardless of whether they are own properties on it — a key `source`
 * never set comes through as `undefined` instead of being left out.
 *
 * @param source - The object to pick from.
 * @param keys - The keys to copy.
 * @returns A new object with `keys` as its own properties.
 */
export function pickFields<T, K extends keyof T>(
    source: T,
    keys: readonly K[]
): Pick<T, K> {
    const result = {} as Pick<T, K>;
    for (const key of keys) {
        result[key] = source[key];
    }
    return result;
}
