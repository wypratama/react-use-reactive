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
