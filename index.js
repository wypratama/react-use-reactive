import { useState } from 'react';

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
const useReactive = (state) => {
  const [variable, setVariable] = useState(state);

  /**
   * Update the state at the given path with a new value.
   * Performs a deep clone before updating to maintain immutability.
   *
   * @param {Array<string|number|symbol>} path - The path to the property to update
   * @param {*} value - The new value
   * @internal
   */
  const updateState = (path, value) => {
    setVariable((prevState) => {
      const newState = structuredClone(prevState);
      /** @type {Record<PropertyKey, any>} */
      let current = newState;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newState;
    });
  };

  /**
   * Creates a ProxyHandler for deep reactivity.
   * Recursively wraps nested objects in Proxies so that accessing
   * a property that is an object returns a reactive Proxy.
   *
   * @param {Record<PropertyKey, any>} _target - The target object to proxy
   * @param {Array<string|number|symbol>} [path=[]] - The current path from root
   * @returns {ProxyHandler<Record<PropertyKey, any>>} A Proxy handler with get/set traps
   * @internal
   */
  const createHandler = (_target, path = []) => ({
    get(target, key) {
      if (typeof target[key] === 'object' && target[key] !== null) {
        return new Proxy(target[key], createHandler(target[key], [...path, key]));
      }
      return target[key];
    },
    set(_target, key, value) {
      updateState([...path, key], value);
      return true;
    },
  });

  return new Proxy(variable, createHandler(variable));
};

export default useReactive;