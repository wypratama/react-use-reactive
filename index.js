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
 * Logical identity of structural tree nodes. A copy-on-write copy of a node
 * KEEPS its logical id (it is the same logical object, mutated), while a brand
 * new object materialized from a fresh assignment gets its own id. Logical ids
 * back the "still-current reference stays writable" guarantee.
 *
 * @type {WeakMap<object, symbol>}
 * @internal
 */
const nodeIds = new WeakMap();

/**
 * Shallow-copy a node so it can be mutated without touching the previous
 * snapshot. Arrays and plain objects keep their prototype. The copy inherits
 * the logical id of the original node.
 *
 * @param {Array<*>|Object} node
 * @returns {*}
 * @internal
 */
const copyNode = (node) => {
  let copy;
  if (Array.isArray(node)) {
    copy = node.slice();
  } else {
    copy = Object.assign(Object.create(Object.getPrototypeOf(node)), node);
  }
  const id = nodeIds.get(node);
  if (id !== undefined) {
    nodeIds.set(copy, id);
  }
  return copy;
};

/**
 * Marker for a cycle edge in the initial value tree. A marker is a frozen leaf
 * that only records the target path of an object that is its own (transitive)
 * ancestor; it is never exposed to user code as data.
 *
 * @type {symbol}
 * @internal
 */
const ALIAS = Symbol('reactUseReactive.alias');

/**
 * Whether `value` is an internal cycle-alias marker.
 *
 * @param {*} value
 * @returns {boolean}
 * @internal
 */
const isAliasMarker = (value) =>
  value !== null && typeof value === 'object' && value[ALIAS] !== undefined;

/**
 * Builds a cycle-alias marker for the given target path.
 *
 * @param {Array<string|symbol|number>} path
 * @returns {Object}
 * @internal
 */
const makeMarker = (path) => Object.freeze({ [ALIAS]: path });

/** @type {WeakMap<object, any>} */
const proxyHandles = new WeakMap();

/**
 * Returns the handle behind a reactive proxy, if `value` is one of ours.
 *
 * @param {*} value
 * @returns {*}
 * @internal
 */
const unwrapHandle = (value) => proxyHandles.get(value);

/**
 * Deep (re)build a value into owned tree data: plain objects and arrays are
 * deep-cloned (unwrapping any of our proxies found inside), every other value
 * is opaque and stored by reference. Each occurrence of a shared reference is
 * cloned into its own branch; reference edges that form a cycle are reduced to
 * alias markers targeting the ancestor path.
 *
 * @param {*} value
 * @param {Array<string|symbol|number>} path - result path of `value`
 * @param {Array<{node: *, path: Array<string|symbol|number>}>} ancestry - originals on the current recursion chain
 * @returns {*}
 * @internal
 */
const toNode = (value, path, ancestry) => {
  const handle = unwrapHandle(value);
  if (handle !== undefined) {
    return toNode(handle.live(), path, ancestry);
  }
  if (Array.isArray(value)) {
    /** @type {Array<*>} */ const out = [];
    nodeIds.set(out, Symbol('node'));
    const chain = ancestry.concat([{ node: value, path }]);
    for (let i = 0; i < value.length; i++) {
      if (!(i in value)) {
        continue;
      }
      const candidate = value[i];
      const hit = chain.find((entry) => entry.node === candidate);
      if (hit !== undefined) {
        out[i] = makeMarker(hit.path);
      } else if (isAliasMarker(candidate)) {
        out[i] = candidate;
      } else {
        out[i] = toNode(candidate, path.concat(i), chain);
      }
    }
    return out;
  }
  if (isPlainObject(value)) {
    const out = Object.create(Object.getPrototypeOf(value));
    nodeIds.set(out, Symbol('node'));
    const chain = ancestry.concat([{ node: value, path }]);
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && descriptor.enumerable && 'value' in descriptor) {
        const candidate = descriptor.value;
        const hit = chain.find((entry) => entry.node === candidate);
        if (hit !== undefined) {
          out[key] = makeMarker(hit.path);
        } else if (isAliasMarker(candidate)) {
          out[key] = candidate;
        } else {
          out[key] = toNode(candidate, path.concat(key), chain);
        }
      }
    }
    return out;
  }
  return value;
};

/**
 * Node currently occupying `path` in the given root tree.
 *
 * @param {*} root
 * @param {Array<string|symbol|number>} path
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
 * targets the handle's node so reflective tools (e.g. `Array.isArray`) see the
 * real data type; all metadata lives in the `handle` closure.
 *
 * @param {{ current: *, cache: WeakMap<object, *>, aliasCache: Map<Array<*>, *>, dispatch: () => void, rootNode: *, root: * }} store -
 *   the store this proxy belongs to
 * @param {{ store: *, follow: boolean, path: Array<string|symbol|number>, node: *, proxy: *, live: () => * }} handle -
 *   the handle of the node being proxied
 * @returns {*}
 * @internal
 */
const makeProxy = (store, handle) => {
  /**
   * Whether writes through this proxy may reach the current tree. Follow
   * handles are always live; bound handles are live while identical to the
   * current occupant or a logical successor (same logical id) of it.
   *
   * @returns {boolean}
   * @internal
   */
  const isLive = () => {
    if (handle.follow) {
      return true;
    }
    const at = nodeAtPath(store.current, handle.path);
    if (at === handle.node) {
      return true;
    }
    return (
      at !== undefined &&
      isStructural(at) &&
      isStructural(handle.node) &&
      nodeIds.get(at) === nodeIds.get(handle.node)
    );
  };

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
      if (node === null || node === undefined) {
        return node;
      }
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
      store.dispatch();
    }
  };

  /**
   * After one of this proxy's own writes, rebind it to the copy now installed
   * at the same path so subsequent writes through the same (possibly held)
   * reference keep targeting live data. The proxy cache is left untouched: it
   * stays keyed by node, so every occupant keeps its own proxy and identity
   * still changes when a node's data changes.
   * @internal
   */
  const rebindAfterWrite = () => {
    if (handle.follow) {
      return;
    }
    const next = nodeAtPath(store.current, handle.path);
    if (next !== undefined && next !== handle.node) {
      handle.node = next;
    }
  };

  /**
   * Returns a (cached) reactive proxy for a structural child at `key`, or a
   * live follow-handle when the child is a cycle alias, or the raw value for
   * opaque primitives.
   *
   * @param {string|symbol|number} key
   * @returns {*}
   * @internal
   */
  const proxyForChild = (key) => {
    const source = handle.live();
    if (source === null || source === undefined) {
      return undefined;
    }
    const value = source[key];
    if (isAliasMarker(value)) {
      return proxyForAlias(store, value[ALIAS]);
    }
    if (!isStructural(value)) {
      return value;
    }
    let cached = store.cache.get(value);
    if (cached === undefined) {
      cached = createHandle(store, {
        follow: false,
        path: handle.path.concat(key),
        node: value,
      });
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
        copy[key] = toNode(value, [], []);
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
    has: (_target, key) => {
      const source = handle.live();
      if (source === null || source === undefined) {
        return false;
      }
      return key in source;
    },
    ownKeys: (_target) => {
      const source = handle.live();
      if (source === null || source === undefined) {
        return [];
      }
      return Reflect.ownKeys(source);
    },
    getOwnPropertyDescriptor: (_target, key) => {
      const source = handle.live();
      if (source === null || source === undefined) {
        return undefined;
      }
      return Reflect.getOwnPropertyDescriptor(source, key);
    },
    defineProperty: (_target, key, descriptor) => {
      if (!isLive()) {
        return true;
      }
      if ('value' in descriptor) {
        commit((node) => {
          const copy = copyNode(node);
          copy[key] = toNode(descriptor.value, [], []);
          return copy;
        });
        rebindAfterWrite();
      }
      return true;
    },
    getPrototypeOf: (_target) => {
      const source = handle.live();
      if (source === null || source === undefined) {
        return Object.prototype;
      }
      return Object.getPrototypeOf(source);
    },
    setPrototypeOf: () => false,
  };

  const proxy = new Proxy(handle.node, handler);
  handle.proxy = proxy;
  proxyHandles.set(proxy, handle);
  return proxy;
};

/**
 * Creates and registers a NodeHandle (and its Proxy) for a tree node or a
 * follow target. Follow handles (the root and cycle aliases) always resolve
 * against the live node at their path; bound handles resolve against the node
 * they captured, upgraded by logical id while the object is still current.
 *
 * @param {*} store - the store this handle belongs to
 * @param {{ follow?: boolean, path: Array<string|symbol|number>, node: * }} spec
 * @returns {{ store: *, follow: boolean, path: Array<string|symbol|number>, node: *, proxy: *, live: () => * }}
 * @internal
 */
const createHandle = (store, spec) => {
  const { follow, path, node } = spec;
  const isFollow = follow === true;
  const handle = {
    store,
    follow: isFollow,
    path,
    node,
    proxy: null,
    /**
     * The object this handle currently points at: for follow handles (root and
     * cycle aliases) the live node at the target path; otherwise the bound
     * node, upgraded to the current logical successor if the node was
     * COW-replaced (same logical id), frozen to the captured node if truly
     * replaced.
     * @returns {*}
     */
    live: () => {
      if (isFollow) {
        return nodeAtPath(store.current, path);
      }
      const at = nodeAtPath(store.current, path);
      if (at === node) {
        return at;
      }
      if (
        at !== undefined &&
        isStructural(at) &&
        isStructural(node) &&
        nodeIds.get(at) === nodeIds.get(node)
      ) {
        return at;
      }
      return node;
    },
  };
  handle.proxy = makeProxy(store, handle);
  return handle;
};

/**
 * Returns the root proxy for the store's current root version. The identity
 * follows the data: it is stable across re-renders until the root node is
 * COW-replaced (any committed write), then a new proxy is cached for the new
 * version. Old versions keep resolving against the live tree.
 *
 * @param {*} store
 * @returns {*}
 * @internal
 */
const getRootProxy = (store) => {
  if (store.rootNode !== store.current) {
    store.rootNode = store.current;
    store.root = createHandle(store, {
      follow: true,
      path: [],
      node: store.current,
    }).proxy;
  }
  return store.root;
};

/**
 * Returns a (cached) live follow-handle for a cycle-alias target path. Aliases
 * to the root share the root proxy identity; other alias targets get their own
 * cached follow-handle per store, so repeated reads of the same cycle edge are
 * identity-stable.
 *
 * @param {*} store
 * @param {Array<string|symbol|number>} targetPath
 * @returns {*}
 * @internal
 */
const proxyForAlias = (store, targetPath) => {
  if (targetPath.length === 0) {
    return getRootProxy(store);
  }
  let cached = store.aliasCache.get(targetPath);
  if (cached === undefined) {
    cached = createHandle(store, {
      follow: true,
      path: targetPath,
      node: nodeAtPath(store.current, targetPath),
    });
    store.aliasCache.set(targetPath, cached);
  }
  return cached.proxy;
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
    aliasCache: new Map(),
    dispatch,
    rootNode: undefined,
    root: null,
  };
  store.root = getRootProxy(store);
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
  const [store] = useState(() => createStore(toNode(state, [], []), dispatch));
  return getRootProxy(store);
};

export default useReactive;