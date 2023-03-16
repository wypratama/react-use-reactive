import { useMemo, useState } from 'react';

const useReactive = <T extends object>(initialState: T) => {
  const [variable, setVariable] = useState(initialState);

  const reactiveObject = useMemo(() => {
    const handleNestedObject = (obj: any): any => {
      Object.keys(obj).forEach((key) => {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          obj[key] = handleNestedObject(obj[key]);
          obj[key] = new Proxy(obj[key], {
            get(target, key) {
              return target[key];
            },
            set(target, prop, value) {
              target[prop] = value;
              setVariable((prevState) => ({
                ...prevState,
                [key]: handleNestedObject(target),
              }));
              return true;
            },
          });
        }
      });
      return obj;
    };

    return handleNestedObject(variable);
  }, [variable]);

  return new Proxy(variable, {
    get(target:any, key:any) {
      return target[key];
    },
    set(target:any, key:any, value) {
      if (typeof target[key] === 'object' && target[key] !== null) {
        reactiveObject(target[key]);
      } else {
        setVariable({
          ...target,
          [key]: value,
        });
      }
      return true;
    },
  }) as Reactive<T>;
};

type Reactive<T> = {
  [P in keyof T]: T[P] extends object ? Reactive<T[P]> : T[P];
};

export default useReactive;
