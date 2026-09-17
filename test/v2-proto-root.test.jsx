import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useReactive from '../index.js';

describe('__proto__ hardening and root validation (FIX9/FIX10)', () => {
  it('rejects __proto__ assignment without mutating the prototype', () => {
    const { result } = renderHook(() => useReactive({ a: 1 }));

    expect(() => {
      act(() => {
        result.current.__proto__ = { polluted: true };
      });
    }).toThrow('does not support "__proto__"');

    expect(Object.getPrototypeOf(result.current)).toBe(Object.prototype);
    expect(Object.hasOwn(result.current, '__proto__')).toBe(false);
    expect(Object.keys(result.current)).toEqual(['a']);

    act(() => {
      result.current.b = 2;
    });
    expect(result.current.b).toBe(2);
  });

  it('rejects Object.assign with JSON __proto__ payload', () => {
    const { result } = renderHook(() => useReactive({ a: 1 }));
    const payload = JSON.parse('{"__proto__":{"polluted":true}}');
    expect(Object.hasOwn(payload, '__proto__')).toBe(true);

    expect(() => {
      act(() => {
        Object.assign(result.current, payload);
      });
    }).toThrow('does not support "__proto__"');

    expect(Object.getPrototypeOf(result.current)).toBe(Object.prototype);
    expect(Object.hasOwn(result.current, '__proto__')).toBe(false);
    expect(result.current.a).toBe(1);
  });

  it('rejects init with a JSON __proto__ payload', () => {
    const init = JSON.parse('{"a":1,"__proto__":{"polluted":true}}');

    expect(() => {
      renderHook(() => useReactive(init));
    }).toThrow('does not support "__proto__"');
  });

  it('rejects nested assignment of a JSON __proto__ payload', () => {
    const { result } = renderHook(() =>
      useReactive({ user: { name: 'a' } })
    );
    const payload = JSON.parse('{"name":"b","__proto__":{"polluted":true}}');

    expect(() => {
      act(() => {
        result.current.user = payload;
      });
    }).toThrow('does not support "__proto__"');

    expect(Object.getPrototypeOf(result.current.user)).toBe(Object.prototype);
    expect(result.current.user).toEqual({ name: 'a' });

    act(() => {
      result.current.user.name = 'c';
    });
    expect(result.current.user.name).toBe('c');
  });

  it('keeps __proto__ reads consistent with getPrototypeOf', () => {
    const { result } = renderHook(() => useReactive({ a: 1 }));

    expect(result.current.__proto__).toBe(Object.getPrototypeOf(result.current));
    expect(result.current.__proto__).toBe(Object.prototype);
  });

  it('does not wrap Object.prototype as reactive state', () => {
    const { result } = renderHook(() => useReactive({ a: 1 }));

    expect(result.current.__proto__).toBe(Object.prototype);
  });

  it('matches plain-JS __proto__ read behavior for null-prototype roots', () => {
    const plain = Object.create(null);
    const { result } = renderHook(() => useReactive(plain));

    expect(Object.getPrototypeOf(result.current)).toBe(null);
    expect(result.current.__proto__).toBe(undefined);
  });

  it.each([
    ['no args', undefined],
    ['null', null],
    ['number', 1],
    ['string', 'hello'],
  ])('rejects an invalid root (%s) with a clear error', (_label, value) => {
    expect(() => {
      renderHook(() => useReactive(value));
    }).toThrow('must be a plain object or array');
  });

  it.each([['Date'], ['Map'], ['Set']])(
    'rejects an opaque %s root',
    (kind) => {
      const value =
        kind === 'Date'
          ? new Date(0)
          : kind === 'Map'
            ? new Map([['k', 1]])
            : new Set([1]);
      expect(() => {
        renderHook(() => useReactive(value));
      }).toThrow('must be a plain object or array');
    }
  );

  it('rejects a class instance root', () => {
    class Box {
      constructor() {
        this.v = 1;
      }
    }
    expect(() => {
      renderHook(() => useReactive(new Box()));
    }).toThrow('must be a plain object or array');
  });

  it('accepts supported roots and keeps array roots functional', () => {
    const empty = renderHook(() => useReactive({}));
    expect(empty.result.current).toEqual({});

    const list = renderHook(() => useReactive([]));
    expect(Array.isArray(list.result.current)).toBe(true);

    const nullProto = renderHook(() =>
      useReactive(Object.assign(Object.create(null), { a: 1 }))
    );
    expect(nullProto.result.current.a).toBe(1);

    const arr = renderHook(() => useReactive([1, 2, 3]));
    act(() => {
      arr.result.current.push(4);
    });
    expect(arr.result.current).toEqual([1, 2, 3, 4]);
  });
});
