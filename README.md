# Package Name

react-use-reactive

## Description

This package provides a custom React hook called `useReactive` which allows you to create a reactive object with nested properties that update automatically when its values change. The reactive object is created using the `useState` and `useMemo` hooks from React.

## Installation

To use this package, you can install it from npm by running the following command:

    npm install react-use-reactive

## Usage

To use the `useReactive` hook in your React component, first import it :

    import useReactive from "react-use-reactive";

Then, you can use the `useReactive` hook to create a reactive object with the initial state of your choice. For example:

    const App = () => {
      const initialState = {
        counter: 0,
        user: {
          name: "John",
          age: 30
        }
      };
      const state = useReactive(initialState);

      // ...
    };

The `state` returned by the `useReactive` hook is a reactive object that you can use in your component's state. Any changes to its properties will automatically trigger a re-render of your component.

    state.user.age = 31
    state // {
        counter: 0,
        user: {
          name: "John",
          age: 31
        }
      };

Usage example with form binding:

    <input
      type="text"
      value={state.user.name}
      onChange={(e) => state.user.name = e.target.value}
    >
    <input
      type="number"
      value={state.counter}
      onChange={(e) => state.counter = +e.target.value}
    >

This allows for nested objects to also become reactive, instead of a non-reactive object being assigned to a reactive property.

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue on GitHub. If you'd like to contribute code, please fork the repository and make a pull request.
