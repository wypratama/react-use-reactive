# React useReactive

`react-use-reactive` is a custom React hook that lets you mutate state like an ordinary JavaScript object while React manages the re-renders. It supports deep reactivity, even for nested objects.

## Installation

To install the `react-use-reactive` hook, run the following command in your project directory:

```sh
npm install react-use-reactive
```

## Usage

First, import the useReactive hook:

```jsx
import useReactive from 'react-use-reactive';
```

Next, use the useReactive hook in your functional components:

```jsx
import React from 'react';
import useReactive from 'react-use-reactive';

const App = () => {
  const state = useReactive({ count: 0, nested: { value: 0 } });

  const incrementCount = () => {
    state.count++;
  };

  const incrementNestedValue = () => {
    state.nested.value++;
  };

  return (
    <div>
      <div>Count: {state.count}</div>
      <button onClick={incrementCount}>Increment Count</button>
      <div>Nested value: {state.nested.value}</div>
      <button onClick={incrementNestedValue}>Increment Nested Value</button>
    </div>
  );
};

export default App;
```

Usage example with form binding:

```jsx
...

const state = useReactive({ user: {firstName: '', lastName: ''} });

...

<input
  type="text"
  value={state.user.firstName}
  onChange={(e) => state.user.firstName = e.target.value}
/>
<input
  type="text"
  value={state.user.lastName}
  onChange={(e) => state.user.lastName = e.target.value}
/>
```

This allows for nested objects to also become reactive, instead of a non-reactive object being assigned to a reactive property.

## Semantics

- **Deep reactivity with synchronous reads.** The state is an immutable copy-on-write tree behind a mutable-facade Proxy. A commit advances the tree immediately, so consecutive `state.count++`, `+=`, and repeated `push()` calls in one handler all accumulate and reads are never stale. React still re-renders only once per batched tick.
- **Root contract.** The initial state must be a plain object or an array (including `Object.create(null)`). Anything else — `undefined`, primitives, `Date`, `Map`/`Set`, class instances — throws `TypeError("useReactive initial state must be a plain object or array")`. Opaque values are valid as nested leaves, not as the root container.
- **Reactive and opaque values.** Plain objects and arrays are deep-reactive structural values. Everything else — functions, `Date`, `RegExp`, class instances, `Map`/`Set` — is **opaque**: stored by reference, returned as-is, and not proxied. Mutating an opaque object's internals directly (`state.date.setFullYear(2030)`) is not tracked; replace the value instead (`state.date = new Date(...)`).
- **Ownership and copy-in.** Structural values in the initial value and in every assignment are **deep-copied away from the caller**: the store owns its tree and caller objects are never mutated. `state.b = state.a` copies instead of aliasing. Each occurrence of a shared reference is copied into its own independent branch. The model is an owned **tree**, so **cycles are rejected** (`TypeError("useReactive does not support cyclic plain objects or arrays")`) and a rejected single-property assignment never partially attaches.
- **Live read-out references.** Assignment *into* state copies, but reading structural values *out* returns live reactive references — not snapshots. `{ ...state }.user === state.user`, and `slice()`/`map()` results can contain live proxies, so mutating a "copy" can mutate state.
- **Arrays.** Array copies preserve exact `length`, holes, and enumerable own properties (indices, extra string keys, enumerable symbols). A hole and an explicit `undefined` element differ (`in`, `Object.keys`). Array roots (`useReactive([1, 2, 3])`) are supported.
- **No-op operations (own-property semantics).** Only an existing *own* property is eligible for same-value comparison (`Object.is`). A missing own property assigned `undefined` — including `push(undefined)` and `items[5] = undefined` — always creates it, and shadowing an inherited key (e.g. `state.toString = ...`) always creates an own property. Deleting a key with no own property is a no-op. Assigning a structural value always creates a new version, even when it looks equal.
- **Identity (fresh paths).** References *freshly read* from the current tree follow data: the root keeps identity until any data changes, and a nested proxy keeps identity while its own data is unchanged. A previously captured proxy that performs its own write keeps its own identity while its data changes, so key `useMemo`/`React.memo` on freshly read paths (`state`, `state.user`).
- **Root vs nested held references.** An old root proxy keeps following the live root. An old nested proxy is path/logical-node bound: it stays live while its node is current and freezes to the captured node once truly replaced. Removed/reordered array elements (`pop`, `splice`, `shift`, `unshift`, `sort`, `reverse`) are frozen path-bound references; writes through them are inert.
- **Stale writes.** Mutations through stale nested references are ignored and can still report success at the Proxy/`Reflect` level (`Reflect.set(stale, ...) === true` while state is unchanged).
- **Unsupported shapes fail loudly.** Accessor or non-enumerable structural properties (except the standard array `length`), `__proto__` as a structural key, `Object.defineProperty`/`defineProperties`, and `Object.preventExtensions`/`freeze`/`seal` all throw a clear `TypeError` before corrupting state; the tree stays usable afterwards. Enumerable data properties are copied as normal mutable state properties; custom descriptor attributes (`writable`/`configurable` flags) are not preserved. `delete arr.length` throws the language-level invariant `TypeError`. A rejected single-property assignment never partially attaches; multi-step natives (`Object.assign`, `splice`, `fill`) apply sequentially, so earlier writes may already have applied before a later value throws — the tree stays internally valid.
- **Descriptors are safe.** `Object.getOwnPropertyDescriptor(state, "user").value` returns the same reactive proxy as `state.user`, never a mutable raw node.
- **Memoization and React Compiler.** `useMemo(..., [state])`, `useMemo(..., [state.user])`, and `React.memo` work when keyed on freshly read paths (regression-tested). React Compiler compatibility is **not guaranteed**: this is an interior-mutability API.
- **Server Components and SSR.** The published entry (`index.js`) starts with the `'use client'` directive, so in RSC environments `useReactive` must be called inside a Client Component. The directive does not disable classic SSR: the hook renders during `renderToString` and hydrates without recoverable errors. Server and client mounts create independent stores, so render the same initial values on both sides.
- **Mutation during render.** Like React state, do not mutate during render; mutate from event handlers and effects.

## TypeScript

The package ships with type declarations. `index.d.ts` is generated from the JSDoc in `index.js` via `npm run build:types` — the JSDoc is the source of truth and the two never drift apart.

```ts
import useReactive from 'react-use-reactive';

const state = useReactive({ count: 0, user: { name: '' } });
state.count++;
state.user.name = '...';
```

Known typing limitation: the generic stays `T extends object` so ordinary interfaces (which lack index signatures) remain assignable. TypeScript therefore cannot exclude opaque roots (`Date`, `Map`, class instances) at compile time — they are rejected at runtime instead.

## Development

```sh
npm ci          # install from lockfile
npm run lint    # oxlint
npm run typecheck  # tsc --noEmit (checks the JSDoc in index.js)
npm test        # vitest
npm run build:types  # regenerate index.d.ts from JSDoc
npm run check:types  # fail if index.d.ts is stale
npm run lint:pack    # publint
npm run check:pack   # verify npm package contents and entry point
```

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue on GitHub. If you'd like to contribute code, please fork the repository and make a pull request.
