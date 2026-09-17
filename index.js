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
 * Whether a key is a canonical array index (excludes `length` and extras).
 *
 * @param {string|symbol|number} key
 * @returns {boolean}
 * @internal
 */
const isArrayIndex = (key) => {
  if (typeof key !== 'string') {
    return false;
  }
  if (key === '') {
    return false;
  }
  const n = Number(key);
  return (
    Number.isInteger(n) &&
    n >= 0 &&
    n < 4294967295 &&
    String(n) === key
  );
};

const CYCLE_MESSAGE =
  'useReactive does not support cyclic plain objects or arrays';
const DESCRIPTOR_MESSAGE =
  'useReactive does not support accessor or non-enumerable structural properties';
const PROTO_MESSAGE =
  'useReactive does not support "__proto__" as a structural key';
const ROOT_MESSAGE =
  'useReactive initial state must be a plain object or array';
const DEFINE_MESSAGE =
  'useReactive does not support Object.defineProperty (custom property descriptors are not supported)';
const INTEGRITY_MESSAGE =
  'useReactive does not support Object.preventExtensions (object integrity operations are not supported)';

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
 * snapshot. Arrays preserve exact `length`, holes, and enumerable own
 * properties (indexed, non-index string keys, and symbols) without
 * materializing holes. Plain objects keep their prototype. The copy inherits
 * the logical id of the original node.
 *
 * @param {*} node
 * @returns {*}
 * @internal
 */
const copyNode = (node) => {
  /** @type {any} */ let copy;
  /** @type {any} */ const source = node;
  if (Array.isArray(source)) {
    copy = new Array(source.length);
    for (let i = 0; i < source.length; i++) {
      if (Object.hasOwn(source, i)) {
        copy[i] = source[i];
      }
    }
    for (const key of Reflect.ownKeys(source)) {
      if (key === 'length') {
        continue;
      }
      if (key === '__proto__') {
        continue;
      }
      if (typeof key === 'string' && isArrayIndex(key)) {
        if (Number(key) < source.length) {
          continue;
        }
      }
      const descriptor = Object.getOwnPropertyDescriptor(source, key);
      if (descriptor && descriptor.enumerable && 'value' in descriptor) {
        /** @type {any} */ (copy)[key] = /** @type {any} */ (source)[key];
      }
    }
  } else {
    copy = Object.create(Object.getPrototypeOf(source));
    for (const key of Reflect.ownKeys(source)) {
      if (key === '__proto__') {
        continue;
      }
      /** @type {any} */ (copy)[key] = /** @type {any} */ (source)[key];
    }
  }
  const id = nodeIds.get(node);
  if (id !== undefined) {
    nodeIds.set(copy, id);
  }
  return copy;
};

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
 * Deep (re)build a value into owned tree data: plain objects and arrays are
 * deep-cloned (unwrapping any of our proxies found inside), every other value
 * is opaque and stored by reference. Each occurrence of a shared reference is
 * cloned into its own branch (the state model is a TREE, never a graph).
 * Structural cycles cannot exist in a tree and are rejected with an error.
 * Accessor or non-enumerable structural properties (except the standard array
 * `length`) are rejected, as is the `__proto__` key, so unsupported shapes
 * fail loudly instead of being silently dropped or polluting prototypes.
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
    for (const key of Reflect.ownKeys(value)) {
      if (key === 'length') {
        continue;
      }
      if (key === '__proto__') {
        throw new TypeError(PROTO_MESSAGE);
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && (!descriptor.enumerable || !('value' in descriptor))) {
        throw new TypeError(DESCRIPTOR_MESSAGE);
      }
    }
    /** @type {Array<*>} */ const out = new Array(value.length);
    nodeIds.set(out, Symbol('node'));
    const chain = ancestry.concat([{ node: value, path }]);
    /** @type {any} */ const source = value;
    /** @type {any} */ const target = out;
    for (let i = 0; i < source.length; i++) {
      if (!Object.hasOwn(source, i)) {
        continue;
      }
      const candidate = source[i];
      assertAcyclic(candidate, chain);
      target[i] = toNode(candidate, path.concat(i), chain);
    }
    for (const key of Reflect.ownKeys(source)) {
      if (key === 'length') {
        continue;
      }
      if (typeof key === 'string' && isArrayIndex(key)) {
        if (Number(key) < source.length) {
          continue;
        }
      }
      const candidate = source[key];
      assertAcyclic(candidate, chain);
      target[key] = toNode(candidate, path.concat(key), chain);
    }
    return out;
  }
  if (isPlainObject(value)) {
    for (const key of Reflect.ownKeys(value)) {
      if (key === '__proto__') {
        throw new TypeError(PROTO_MESSAGE);
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && (!descriptor.enumerable || !('value' in descriptor))) {
        throw new TypeError(DESCRIPTOR_MESSAGE);
      }
    }
    const out = Object.create(Object.getPrototypeOf(value));
    nodeIds.set(out, Symbol('node'));
    const chain = ancestry.concat([{ node: value, path }]);
    /** @type {any} */ const target = out;
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && descriptor.enumerable && 'value' in descriptor) {
        const candidate = descriptor.value;
        assertAcyclic(candidate, chain);
        target[key] = toNode(candidate, path.concat(key), chain);
      }
    }
    return out;
  }
  return value;
};

/**
 * Throws when `candidate` is its own (transitive) ancestor in the current
 * conversion chain, i.e. when the value is a structural cycle.
 *
 * @param {*} candidate
 * @param {Array<{node: *, path: Array<string|symbol|number>}>} chain
 * @internal
 */
const assertAcyclic = (candidate, chain) => {
  if (chain.some((entry) => entry.node === candidate)) {
    throw new TypeError(CYCLE_MESSAGE);
  }
};

/**
 * Builds (and registers) the reactive Proxy for a NodeHandle. The Proxy
 * targets the handle's node so reflective tools (e.g. `Array.isArray`) see the
 * real data type; all metadata lives in the `handle` closure.
 *
 * @param {{ current: *, cache: WeakMap<object, *>, dispatch: () => void, rootNode: *, root: * }} store -
 *   the store this proxy belongs to
 * @param {{ isRoot: boolean, path: Array<string|symbol|number>, node: *, proxy: *, live: () => * }} handle -
 *   the handle of the node being proxied
 * @returns {*}
 * @internal
 */
const makeProxy = (store, handle) => {
  /**
   * Whether writes through this proxy may reach the current tree. The root is
   * always live; bound handles are live while identical to the current
   * occupant or a logical successor (same logical id) of it, and frozen once
   * the node under them is truly replaced.
   *
   * @returns {boolean}
   * @internal
   */
  const isLive = () => {
    if (handle.isRoot) {
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
    if (handle.isRoot) {
      return;
    }
    const next = nodeAtPath(store.current, handle.path);
    if (next !== undefined && next !== handle.node) {
      handle.node = next;
    }
  };

  /**
   * Returns a (cached) reactive proxy for a structural child at `key`, or the
   * raw value for opaque primitives. The `__proto__` key is never wrapped so
   * prototype reads stay consistent with `Object.getPrototypeOf`.
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
    if (key === '__proto__') {
      return source[key];
    }
    const value = source[key];
    if (!isStructural(value)) {
      return value;
    }
    let cached = store.cache.get(value);
    if (cached === undefined) {
      cached = createHandle(store, {
        isRoot: false,
        path: handle.path.concat(key),
        node: value,
      });
      store.cache.set(value, cached);
    }
    return cached.proxy;
  };

  /**
   * Whether an assignment is a logical no-op that must not create a new state
   * version. Only an existing OWN property is eligible for same-value
   * comparison (`Object.is`); a missing own property is always a mutation,
   * even when the normal lookup also produces `undefined`. This keeps
   * `state.foo = undefined`, `push(undefined)`, and inherited-key shadowing
   * (`state.toString = ...`) observable. Structural values always trigger a
   * copy-on-write (assignment copies, it never aliases).
   *
   * @param {string|symbol|number} key
   * @param {*} value
   * @returns {boolean}
   * @internal
   */
  const isNoopWrite = (key, value) => {
    const source = handle.live();
    if (source === null || source === undefined) {
      return true;
    }
    if (!Object.hasOwn(source, key)) {
      return false;
    }
    const inner = unwrapHandle(value) ? unwrapHandle(value).live() : value;
    if (isStructural(inner)) {
      return false;
    }
    return Object.is(source[key], inner);
  };

  /** @type {ProxyHandler<*>} */
  const handler = {
    get: (_target, key) => proxyForChild(key),
    set: (_target, key, value) => {
      if (key === '__proto__') {
        throw new TypeError(PROTO_MESSAGE);
      }
      if (!isLive()) {
        return true;
      }
      if (isNoopWrite(key, value)) {
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
      const source = handle.live();
      if (source === null || source === undefined || !Object.hasOwn(source, key)) {
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
    defineProperty: () => {
      throw new TypeError(DEFINE_MESSAGE);
    },
    preventExtensions: () => {
      throw new TypeError(INTEGRITY_MESSAGE);
    },
    isExtensible: () => {
      const source = handle.live();
      if (source === null || source === undefined) {
        return true;
      }
      return Reflect.isExtensible(source);
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
      const descriptor = Reflect.getOwnPropertyDescriptor(source, key);
      if (descriptor === undefined) {
        return undefined;
      }
      if ('value' in descriptor && isStructural(descriptor.value)) {
        if (key === '__proto__') {
          return descriptor;
        }
        return { ...descriptor, value: proxyForChild(key) };
      }
      return descriptor;
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
 * Creates and registers a NodeHandle (and its Proxy) for a tree node. Follow
 * handles resolve against the live node at their path; bound handles resolve
 * against the node they captured, upgraded by logical id while the object is
 * still current, frozen to the captured node if truly replaced.
 *
 * @param {*} store - the store this handle belongs to
 * @param {{ isRoot?: boolean, path: Array<string|symbol|number>, node: * }} spec
 * @returns {{ isRoot: boolean, path: Array<string|symbol|number>, node: *, proxy: *, live: () => * }}
 * @internal
 */
const createHandle = (store, spec) => {
  const { isRoot, path, node } = spec;
  const handle = {
    isRoot: isRoot === true,
    path,
    node,
    proxy: null,
    /**
     * The object this handle currently points at: the live tree for the root,
     * otherwise the bound node upgraded to the current logical successor, or
     * frozen to the captured node if truly replaced.
     * @returns {*}
     */
    live: () => {
      if (handle.isRoot) {
        return nodeAtPath(store.current, handle.path);
      }
      const at = nodeAtPath(store.current, handle.path);
      if (at === handle.node) {
        return at;
      }
      if (
        at !== undefined &&
        isStructural(at) &&
        isStructural(handle.node) &&
        nodeIds.get(at) === nodeIds.get(handle.node)
      ) {
        return at;
      }
      return handle.node;
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
      isRoot: true,
      path: [],
      node: store.current,
    }).proxy;
  }
  return store.root;
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
    rootNode: undefined,
    root: null,
  };
  store.root = getRootProxy(store);
  return store;
};

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
const useReactive = (state) => {
  if (!isStructural(state)) {
    throw new TypeError(ROOT_MESSAGE);
  }
  const [, dispatch] = useReducer((count) => count + 1, 0);
  const [store] = useState(() => createStore(toNode(state, [], []), dispatch));
  return getRootProxy(store);
};

export default useReactive;
