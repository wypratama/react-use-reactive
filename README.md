# React useReactive

`react-use-reactive` is a custom React hook that allows you to create reactive objects using `useState`. It supports deep reactivity and updates, even for nested objects.

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

## Known limitations

These are accepted limitations of the current runtime design. Improving them is planned, not part of the current behavior contract.

- **Consecutive mutations in one synchronous block do not accumulate.** Reads go through the snapshot captured at the last render, so a read-modify-write sequence such as `state.count++; state.count++;` in a single handler leaves `count` at `1` (each write observes the same pre-render value). The same applies to e.g. calling `state.items.push(x)` twice in one handler — only the last write to a given slot is kept. Mutations in separate user events / separate renders work correctly.
- **`delete` is not tracked.** There is no `deleteProperty` trap, so `delete state.nested.prop` mutates the underlying object directly without scheduling a re-render. Prefer assigning `undefined` or building a replacement object.
- **Nested proxies are not memoized.** Reading an object property returns a new `Proxy` each time, so `state.nested !== state.nested`. A reference captured before the object is replaced will, when mutated, write to whichever object currently lives at that path (i.e. the replacement), not the original object.

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
