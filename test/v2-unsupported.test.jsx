import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useReactive from '../index.js';

describe('unsupported descriptors and integrity operations (FIX7/FIX8/FIX20)', () => {
  it('rejects an enumerable getter at init', () => {
    const init = {};
    Object.defineProperty(init, 'computed', {
      get() {
        return 42;
      },
      enumerable: true,
      configurable: true,
    });

    expect(() => {
      renderHook(() => useReactive(init));
    }).toThrow(
      'does not support accessor or non-enumerable structural properties'
    );
  });

  it('rejects a setter at init', () => {
    const init = { a: 1 };
    Object.defineProperty(init, 'x', {
      set(_v) {},
      enumerable: true,
      configurable: true,
    });

    expect(() => {
      renderHook(() => useReactive(init));
    }).toThrow(
      'does not support accessor or non-enumerable structural properties'
    );
  });

  it('rejects a nested accessor at init', () => {
    const init = { nested: {} };
    Object.defineProperty(init.nested, 'computed', {
      get() {
        return 42;
      },
      enumerable: true,
      configurable: true,
    });

    expect(() => {
      renderHook(() => useReactive(init));
    }).toThrow(
      'does not support accessor or non-enumerable structural properties'
    );
  });

  it('rejects a custom non-enumerable data property at init', () => {
    const init = { a: 1 };
    Object.defineProperty(init, 'hidden', {
      value: 42,
      enumerable: false,
      configurable: true,
      writable: true,
    });

    expect(() => {
      renderHook(() => useReactive(init));
    }).toThrow(
      'does not support accessor or non-enumerable structural properties'
    );
  });

  it('rejects a non-enumerable symbol at init', () => {
    const sym = Symbol('hidden');
    const init = { a: 1 };
    Object.defineProperty(init, sym, {
      value: 42,
      enumerable: false,
      configurable: true,
      writable: true,
    });

    expect(() => {
      renderHook(() => useReactive(init));
    }).toThrow(
      'does not support accessor or non-enumerable structural properties'
    );
  });

  it('rejects assigning an unsupported structural value without partial attach', () => {
    const { result } = renderHook(() => useReactive({ obj: { v: 1 } }));
    const bad = {};
    Object.defineProperty(bad, 'computed', {
      get() {
        return 1;
      },
      enumerable: true,
      configurable: true,
    });

    expect(() => {
      act(() => {
        result.current.obj = bad;
      });
    }).toThrow(
      'does not support accessor or non-enumerable structural properties'
    );

    expect(result.current.obj).toEqual({ v: 1 });

    act(() => {
      result.current.obj.v = 2;
      result.current.other = 1;
    });
    expect(result.current.obj.v).toBe(2);
    expect(result.current.other).toBe(1);
  });

  it('does not reject the standard array length descriptor', () => {
    const { result } = renderHook(() => useReactive({ items: [1, 2, 3] }));

    expect(result.current.items.length).toBe(3);

    act(() => {
      result.current.items.push(4);
    });

    expect(result.current.items).toEqual([1, 2, 3, 4]);
  });

  it('rejects preventExtensions without mutating the target', () => {
    const { result } = renderHook(() => useReactive({ a: 1 }));

    expect(() => {
      Object.preventExtensions(result.current);
    }).toThrow('does not support Object.preventExtensions');

    expect(Object.isExtensible(result.current)).toBe(true);

    act(() => {
      result.current.foo = 1;
    });
    expect(result.current.foo).toBe(1);
    expect(Object.keys(result.current)).toEqual(['a', 'foo']);
  });

  it('rejects freeze without poisoning state or held proxies', () => {
    const { result } = renderHook(() => useReactive({ a: 1 }));
    const held = result.current;

    expect(() => {
      Object.freeze(result.current);
    }).toThrow('does not support Object.preventExtensions');

    expect(Object.isExtensible(result.current)).toBe(true);

    act(() => {
      result.current.b = 2;
    });

    expect(() => Object.keys(held)).not.toThrow();
    expect(() =>
      Object.getOwnPropertyDescriptor(held, 'b')
    ).not.toThrow();
    expect(result.current).toEqual({ a: 1, b: 2 });

    act(() => {
      result.current.c = 3;
    });
    expect(result.current.c).toBe(3);
  });

  it('rejects seal without poisoning state', () => {
    const { result } = renderHook(() => useReactive({ a: 1 }));

    expect(() => {
      Object.seal(result.current);
    }).toThrow('does not support Object.preventExtensions');

    expect(Object.isExtensible(result.current)).toBe(true);

    act(() => {
      result.current.b = 2;
    });
    expect(result.current.b).toBe(2);
  });

  it('rejects integrity operations on nested proxies too', () => {
    const { result } = renderHook(() =>
      useReactive({ nested: { a: 1 } })
    );
    const nested = result.current.nested;

    expect(() => {
      Object.preventExtensions(nested);
    }).toThrow('does not support Object.preventExtensions');
    expect(() => {
      Object.freeze(nested);
    }).toThrow('does not support Object.preventExtensions');

    expect(Object.isExtensible(result.current.nested)).toBe(true);

    act(() => {
      result.current.nested.b = 2;
    });
    expect(result.current.nested).toEqual({ a: 1, b: 2 });
    expect(() => Object.keys(nested)).not.toThrow();
  });

  it('forwards isExtensible to the live source', () => {
    const { result } = renderHook(() => useReactive({ a: 1 }));

    expect(Object.isExtensible(result.current)).toBe(true);
    expect(Reflect.isExtensible(result.current)).toBe(true);
  });
});
