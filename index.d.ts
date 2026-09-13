/**
 * Creates a reactive state object.
 * Wraps the state in a Proxy to detect and react to changes.
 * Provides deep reactivity for nested objects.
 *
 * @param state - The initial state object
 * @returns A reactive proxy of the state
 * @template T - The type of state object
 * @example
 * const state = useReactive({ count: 0, nested: { value: 0 } });
 * state.count++; // triggers re-render
 */
declare const useReactive: <T extends object>(state: T) => T;

export default useReactive;