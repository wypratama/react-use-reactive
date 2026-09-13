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
- **What is reactive.** Only plain objects and arrays (including `Object.create(null)`) are deep-reactive. Everything else — functions, `Date`, `RegExp`, class instances, `Map`/`Set` — is stored **by reference** and is not proxied: replace it rather than mutating it.
- **Ownership.** The initial value and every assigned value are deep-copied away from the caller; caller-owned objects are never mutated, and `state.b = state.a` copies the data instead of aliasing. Each occurrence of a shared initial reference is copied into its own branch, so there are no silently shared subtrees; cyclic initial values are supported (a back-reference resolves to its live target, e.g. `state.self === state`).
- **Identity.** The root object keeps its identity across re-renders **until data under it changes**; the moment any data changes, the root gets a fresh identity (React detects the change via `Object.is`). Nested objects keep their identity while their own data is unchanged and receive a fresh identity when the node's data changes.

This identity-follows-data pattern is what `React.memo`, `useMemo` dependencies, and the React Compiler rely on: they can only see a change when the reference changes, so references must change exactly when the underlying data changes.
- **Stale references.** A reference captured before its object was replaced reads a frozen view of the old object and its writes are inert (they cannot affect the current state).
- **Mutation ownership model.** Use copies, not in-place edits of the object you pass in, and prefer mutating the returned proxy from event handlers or effects. Like React state, the hook does not support mutating during render.

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
