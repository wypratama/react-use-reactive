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
- **Reactive and opaque values.** Plain objects and arrays (including `Object.create(null)`) are deep-reactive. Everything else — functions, `Date`, `RegExp`, class instances, `Map`/`Set` — is **opaque**: stored by reference, returned as-is, and not proxied. Mutating an opaque object's internals directly (`state.date.setFullYear(2030)`) does not pass through the reactive Proxy and is not tracked; replace the value instead (`state.date = new Date(...)`).
- **Ownership.** Structural values (plain objects and arrays) in the initial value and in every assignment are **deep-copied away from the caller**: caller-owned objects are never mutated, and `state.b = state.a` copies the data instead of aliasing. Each occurrence of a shared initial reference is copied into its own independent branch. Opaque values are retained by reference (`state.date === date` after init). The state model is an owned **tree**, so **cyclic structural values are rejected**: passing or assigning an object or array that references itself throws a `TypeError` (`"useReactive does not support cyclic plain objects or arrays"`), and the rejected value is never committed.
- **Identity.** The root object keeps its identity across re-renders **until data under it changes**; the moment any data changes, the root gets a fresh identity (React detects the change via `Object.is`). Nested objects keep their identity while their own data is unchanged and receive a fresh identity when the node's data changes.

This identity-follows-data pattern is exactly what manual `React.memo` and `useMemo` dependencies rely on: they compare references with `Object.is`, so a reference changes exactly when the underlying data changes.
- **No-op operations.** Assigning a leaf value that is `Object.is`-equal to the current value — or deleting a key that is not present — is a no-op: no new state version is created, so the identity of the root (and any `useMemo`/`React.memo` keyed on it) is preserved. Assigning a structural value always creates a new version, even when it looks equal.
- **`defineProperty`.** `Object.defineProperty` and `Object.defineProperties` on reactive state are **not supported** and throw a `TypeError` (`"useReactive does not support Object.defineProperty"`). Custom property descriptors — getters/setters, non-writable or non-configurable attributes — are out of scope; use plain assignment, `delete`, and `Object.assign` instead.
- **React Compiler.** React Compiler compatibility is **not currently guaranteed**. `useReactive` intentionally exposes a mutable-facade API, which differs from React's recommendation that values returned from Hooks be treated as immutable. `useMemo` and `React.memo` behavior is regression-tested, but users should not assume Compiler compatibility.
- **Stale references.** A reference captured before its object was replaced reads a frozen view of the old object and its writes are inert (they cannot affect the current state).
- **Server Components and SSR.** The published entry (`index.js`) starts with the `'use client'` directive, so in RSC environments the package is a Client Component and `useReactive` must be called inside one. The directive does not disable classic SSR: the hook renders during `renderToString` and hydrates without recoverable errors. As with any component state, the server and client mounts create independent stores, so render the same initial values on both sides to keep the markup in sync.
- **Mutation during render.** Like React state, the hook does not support mutating during render; mutate the returned proxy from event handlers and effects. Pass in copies: the loop owns the visible object, and caller-owned objects are never mutated.

## TypeScript

The package ships with type declarations. `index.d.ts` is generated from the JSDoc in `index.js` via `npm run build:types` — the JSDoc is the source of truth and the two never drift apart.

```ts
import useReactive from 'react-use-reactive';

const state = useReactive({ count: 0, user: { name: '' } });
state.count++;
state.user.name = '...';
```

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
