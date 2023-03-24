import { useState } from 'react';

type Path = (string | number | symbol)[];

const useReactive = <T extends object>(state: T): T => {
  const [variable, setVariable] = useState<T>(state);

  const updateState = (path: Path, value: any) => {
    setVariable(prevState => {
      const newState = JSON.parse(JSON.stringify(prevState)); // Create a deep copy
      let current: any = newState;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newState;
    });
  };

  const createHandler = <K extends Record<string, any>>(
    _target: K,
    path: Path = []
  ): ProxyHandler<K> => ({
    get(target: K, key: string | number | symbol) {
      const typedKey = key as keyof K;
      if (typeof target[typedKey] === 'object' && target[typedKey] !== null) {
        return new Proxy(
          target[typedKey],
          createHandler(target[typedKey], [...path, key])
        );
      } else {
        return target[typedKey];
      }
    },
    set(_target: K, key: string | number | symbol, value: any) {
      updateState([...path, key], value);
      return true;
    },
  });

  return new Proxy<T>(variable, createHandler(variable));
};

export default useReactive;
