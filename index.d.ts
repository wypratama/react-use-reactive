export default useReactive;
/**
 * Creates a reactive state object. Mutate the returned proxy like an ordinary
 * object; the hook re-renders when committed data changes.
 *
 * The root must be a plain object or an array (including
 * `Object.create(null)`). Plain objects and arrays are deep-reactive
 * structural values; everything else (functions, `Date`, `Map`/`Set`, class
 * instances, ...) is an opaque leaf: valid as nested values stored by
 * reference, not as the root container.
 *
 * Structural values assigned into state are deep-copied (assignment never
 * aliases); structural values read out remain live reactive references.
 * Shared references are copied apart per occurrence (owned tree); cycles are
 * rejected. References freshly read from the current tree change identity
 * exactly when their data changes; a previously captured reference that
 * performs its own write keeps its own identity.
 *
 * @template {object} T - The type of the state object (plain object or array shape)
 * @param {T} state - The initial state; must be a plain object or array.
 * @returns {T} A reactive proxy of the state.
 * @throws {TypeError} If `state` is not a plain object or array, holds an
 * accessor or non-enumerable structural property, holds `__proto__`, or is cyclic.
 * @example
 * const state = useReactive({ count: 0, nested: { value: 0 } });
 * state.count++; // triggers re-render
 * state.nested.value++; // triggers re-render
 */
declare function useReactive<T extends object>(state: T): T;
