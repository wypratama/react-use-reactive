'use client';

import { useReducer, useState } from 'react';

/**
 * Whether a value is a plain object (prototype `Object.prototype` or `null`).
 *
 * @param {*} value
 * @returns {boolean}
 * @internal
 */
const isPlainObject = (value) => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/**
 * Whether a value should be treated as deep-reactive structure.
 * Only plain objects and arrays are reactive; every other value is opaque.
 *
 * @param {*} value
 * @returns {boolean}
 * @internal
 */
const isStructural = (value) => Array.isArray(value) || isPlainObject(value);

/**
 * Shallow-copy a node so it can be mutated without touching the previous
 * snapshot. Arrays and plain objects keep their prototype.
 *
 * @param {Array<*>|Object} node
 * @returns {*}
 * @internal
 */
const copyNode = (node) => {
  if (Array.isArray(node)) {
    return node.slice();
  }
  return Object.assign(Object.create(Object.getPrototypeOf(node)), node);
};

/** @type {WeakMap<object, { isRoot: boolean, path: Array<string|symbol>, node: *, proxy: * }>} */
const proxyHandles = new WeakMap();

/**
 * Returns the handle behind a reactive proxy, if `value` is one of ours.
 *
 * @param {*} value
 * @returns {Parameters<typeof makeProxy>[1]|undefined}
 * @internal
 */
const unwrapHandle = (value) => proxyHandles.get(value);

/**
 * Deep (re)build a value into owned tree data: plain objects and arrays are
 * deep-cloned (unwrapping any of our proxies found inside), every other value
 * is opaque and stored by reference. Supports cyclic input.
 *
 * @param {*} value
 * @param {Map<object, object>} [memo] - source-to-target map for cycles
 * @returns {*}
 * @internal
 */
const toNode = (value, memo = new Map()) => {
  const handle = unwrapHandle(value);
  if (handle !== undefined) {
    return toNode(handle.node, memo);
  }
  if (Array.isArray(value)) {
    if (memo.has(value)) {
      return memo.get(value);
    }
    /** @type {Array<*>} */ const out = [];
    memo.set(value, out);
    for (let i = 0; i < value.length; i++) {
      if (i in value) {
        out[i] = toNode(value[i], memo);
      }
    }
    return out;
  }
  if (isPlainObject(value)) {
    if (memo.has(value)) {
      return memo.get(value);
    }
    const out = Object.create(Object.getPrototypeOf(value));
    memo.set(value, out);
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && descriptor.enumerable && 'value' in descriptor) {
        out[key] = toNode(descriptor.value, memo);
      }
    }
    return out;
  }
  return value;
};

/**
 * Node currently occupying `path` in the given root tree, or `undefined`.
 *
 * @param {*} root
 * @param {Array<string|symbol>} path
 * @returns {*}
 * @internal
 */
const nodeAtPath = (root, path) => {
  let node = root;
  for (const key of path) {
    if (node === null || node === undefined) {
      return undefined;
    }
    node = node[key];
  }
  return node;
};

/**
 * Builds (and registers) the reactive Proxy for a NodeHandle. The Proxy
 * targets the node itself so reflective tools (e.g. `Array.isArray`) see the
 * real data type; all metadata lives in the `handle` closure.
 *
 * @param {{ current: *, cache: WeakMap<object, *>, dispatch: () => void, root: * }} store -
 *   the store this proxy belongs to
 * @param {{ isRoot: boolean, path: Array<string|symbol>, node: *, proxy: * }} handle -
 *   the handle of the node being proxied
 * @returns {*}
 * @internal
 */
const makeProxy = (store, handle) => {
  /**
   * The object this handle currently points at: the root tree for the root
   * handle, otherwise the bound node.
   *
   * @returns {*}
   * @internal
   */
  const liveNode = () => (handle.isRoot ? store.current : handle.node);

  /**
   * Whether the bound node is still the one occupying its path in the current
   * tree. The root is always live; a replaced/detached node is not.
   *
   * @returns {boolean}
   * @internal
   */
  const isLive = () =>
    handle.isRoot || nodeAtPath(store.current, handle.path) === handle.node;

  /**
   * Applies a mutation to the node at `handle.path` by copy-on-write.
   *
   * @param {(node: *) => *} mutate - receives the current node, returns the next
   * @internal
   */
  const commit = (mutate) => {
    /**
     * @param {*} node
     * @param {number} index
     * @returns {*}
     * @internal
     */
    const branch = (node, index) => {
      if (index === handle.path.length) {
        return mutate(node);
      }
      const child = node[handle.path[index]];
      const nextChild = branch(child, index + 1);
      if (nextChild === child) {
        return node;
      }
      const copy = copyNode(node);
      copy[handle.path[index]] = nextChild;
      return copy;
    };
    const nextRoot = branch(store.current, 0);
    if (nextRoot !== store.current) {
      store.current = nextRoot;
      if (handle.isRoot) {
        handle.node = nextRoot;
      }
      store.dispatch();
    }
  };

  /**
   * After one of this proxy's own writes, rebind it to the copy now installed
   * at the same path so subsequent writes through the same (possibly held)
   * reference keep targeting live data.
   * @internal
   */
  const rebindAfterWrite = () => {
    if (handle.isRoot) {
      return;
    }
    const next = nodeAtPath(store.current, handle.path);
    if (next !== handle.node) {
      handle.node = next;
    }
  };

  /**
   * Returns a (cached) reactive proxy for a structural child at `key`.
   *
   * @param {string|symbol} key
   * @returns {*}
   * @internal
   */
  const proxyForChild = (key) => {
    const value = liveNode()[key];
    if (!isStructural(value)) {
      return value;
    }
    let cached = store.cache.get(value);
    if (cached === undefined) {
      cached = { isRoot: false, path: handle.path.concat(key), node: value, proxy: null };
      cached.proxy = makeProxy(store, cached);
      store.cache.set(value, cached);
    }
    return cached.proxy;
  };

  /** @type {ProxyHandler<*>} */
  const handler = {
    get: (_target, key) => proxyForChild(key),
    set: (_target, key, value) => {
      if (!isLive()) {
        return true;
      }
      commit((node) => {
        const copy = copyNode(node);
        copy[key] = toNode(value);
        return copy;
      });
      rebindAfterWrite();
      return true;
    },
    deleteProperty: (_target, key) => {
      if (!isLive()) {
        return true;
      }
      commit((node) => {
        const copy = copyNode(node);
        delete copy[key];
        return copy;
      });
      rebindAfterWrite();
      return true;
    },
    has: (_target, key) => key in liveNode(),
    ownKeys: (_target) => Reflect.ownKeys(liveNode()),
    getOwnPropertyDescriptor: (_target, key) =>
      Reflect.getOwnPropertyDescriptor(liveNode(), key),
    defineProperty: (_target, key, descriptor) => {
      if (!isLive()) {
        return true;
      }
      if ('value' in descriptor) {
        commit((node) => {
          const copy = copyNode(node);
          copy[key] = toNode(descriptor.value);
          return copy;
        });
        rebindAfterWrite();
      }
      return true;
    },
    getPrototypeOf: (_target) => Object.getPrototypeOf(liveNode()),
    setPrototypeOf: () => false,
  };

  const proxy = new Proxy(handle.isRoot ? store.current : handle.node, handler);
  handle.proxy = proxy;
  proxyHandles.set(proxy, handle);
  return proxy;
};

/**
 * Creates a fresh store: an owned copy-on-write tree plus its root proxy.
 *
 * @param {*} current - the owner-cloned initial root
 * @param {() => void} dispatch - forces a re-render of the owning component
 * @returns {Parameters<typeof makeProxy>[0]}
 * @internal
 */
const createStore = (current, dispatch) => {
  /** @type {Parameters<typeof makeProxy>[0]} */
  const store = {
    current,
    cache: new WeakMap(),
    dispatch,
    root: null,
  };
  store.root = makeProxy(store, {
    isRoot: true,
    path: [],
    node: current,
    proxy: null,
  });
  return store;
};

/**
 * Creates a reactive state object.
 * Wraps the state in a Proxy to detect and react to changes.
 * Uses React state under the hood for re-rendering.
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
  const [, dispatch] = useReducer((count) => count + 1, 0);
  const [store] = useState(() => createStore(toNode(state), dispatch));
  return store.root;
};

export default useReactive;