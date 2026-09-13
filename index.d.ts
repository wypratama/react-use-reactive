export default useReactive;
/**
 * Creates a reactive state object.
 * Wraps the state in a Proxy to detect and react to changes.
 * Uses React.useState under the hood for re-rendering.
 * Provides deep reactivity for nested objects.
 *
 * @template {object} T - The type of the state object
 * @param {T} state - The initial state object
 * @returns {T} A reactive proxy of the state
 * @example
 * const state = useReactive({ count: 0, nested: { value: 0 } });
 * state.count++; // triggers re-render
 * state.nested.value++; // triggers re-render
 */
declare function useReactive<T extends object>(state: T): T;
