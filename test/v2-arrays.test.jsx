import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useReactive from '../index.js';

describe('sparse arrays and array extra properties (FIX5/FIX6/FIX19)', () => {
  it('preserves an all-hole array without materializing undefined', () => {
    const sparse = new Array(3);
    const { result } = renderHook(() => useReactive({ items: sparse }));

    expect(result.current.items.length).toBe(3);
    expect(0 in result.current.items).toBe(false);
    expect(1 in result.current.items).toBe(false);
    expect(2 in result.current.items).toBe(false);
    expect(Object.hasOwn(result.current.items, '0')).toBe(false);
    expect(Reflect.ownKeys(result.current.items)).toEqual(['length']);
  });

  it('preserves trailing holes', () => {
    const sparse = [1];
    sparse.length = 5;
    const { result } = renderHook(() => useReactive({ items: sparse }));

    expect(result.current.items.length).toBe(5);
    expect(0 in result.current.items).toBe(true);
    expect(result.current.items[0]).toBe(1);
    expect(1 in result.current.items).toBe(false);
    expect(4 in result.current.items).toBe(false);
    expect(Object.hasOwn(result.current.items, '1')).toBe(false);
  });

  it('preserves length and holes when assigning a sparse array', () => {
    const { result } = renderHook(() => useReactive({ items: [1] }));

    act(() => {
      result.current.items = new Array(5);
    });

    expect(result.current.items.length).toBe(5);
    expect(0 in result.current.items).toBe(false);
    expect(4 in result.current.items).toBe(false);
    expect(Reflect.ownKeys(result.current.items)).toEqual(['length']);
  });

  it('preserves interior holes like [1,,3]', () => {
    const { result } = renderHook(() => useReactive({ items: [1, , 3] }));

    expect(result.current.items.length).toBe(3);
    expect(0 in result.current.items).toBe(true);
    expect(1 in result.current.items).toBe(false);
    expect(2 in result.current.items).toBe(true);
    expect(Object.keys(result.current.items)).toEqual(['0', '2']);
  });

  it('distinguishes a hole from an explicit undefined', () => {
    const { result } = renderHook(() => useReactive({ items: [1, , 3] }));

    act(() => {
      result.current.items[1] = undefined;
    });

    expect(1 in result.current.items).toBe(true);
    expect(Object.hasOwn(result.current.items, '1')).toBe(true);
    expect(result.current.items[1]).toBeUndefined();
    expect(Object.keys(result.current.items)).toEqual(['0', '1', '2']);
  });

  it('preserves extra enumerable string props through init', () => {
    const items = [1, 2];
    items.foo = 'bar';
    const { result } = renderHook(() => useReactive({ items }));

    expect(result.current.items.foo).toBe('bar');
    expect(Object.keys(result.current.items)).toContain('foo');
  });

  it('preserves extra enumerable symbol props through init', () => {
    const sym = Symbol('metadata');
    const items = [1, 2];
    items[sym] = 'value';
    const { result } = renderHook(() => useReactive({ items }));

    expect(result.current.items[sym]).toBe('value');
    expect(Reflect.ownKeys(result.current.items)).toContain(sym);
  });

  it('preserves extra string props across COW writes and push', () => {
    const { result } = renderHook(() => useReactive({ items: [1, 2] }));

    act(() => {
      result.current.items.foo = 'A';
    });
    act(() => {
      result.current.items.bar = 'B';
    });

    expect(result.current.items.foo).toBe('A');
    expect(result.current.items.bar).toBe('B');

    act(() => {
      result.current.items.push(3);
    });

    expect([...result.current.items]).toEqual([1, 2, 3]);
    expect(result.current.items.foo).toBe('A');
    expect(result.current.items.bar).toBe('B');
    expect(Reflect.ownKeys(result.current.items)).toEqual(
      expect.arrayContaining(['0', '1', '2', 'foo', 'bar', 'length'])
    );
  });

  it('preserves extra symbol props across mutations', () => {
    const sym = Symbol('metadata');
    const { result } = renderHook(() => useReactive({ items: [1, 2] }));

    act(() => {
      result.current.items[sym] = 'value';
    });

    expect(result.current.items[sym]).toBe('value');

    act(() => {
      result.current.items.push(3);
    });

    expect(result.current.items[sym]).toBe('value');
    expect(Reflect.ownKeys(result.current.items)).toContain(sym);
  });

  it('keeps extras, holes, and length coherent under array methods', () => {
    const { result } = renderHook(() => useReactive({ items: [3, 1, 2] }));

    act(() => {
      result.current.items.foo = 'keep';
    });

    act(() => {
      result.current.items.sort();
    });
    expect([...result.current.items.slice(0, 3)]).toEqual([1, 2, 3]);
    expect(result.current.items.foo).toBe('keep');

    act(() => {
      result.current.items.reverse();
    });
    expect(result.current.items.foo).toBe('keep');

    act(() => {
      result.current.items.splice(1, 1, 'x');
    });
    expect(result.current.items.foo).toBe('keep');

    act(() => {
      result.current.items.fill(0, 0, 1);
    });
    expect(result.current.items.foo).toBe('keep');

    act(() => {
      result.current.items.copyWithin(0, 1);
    });
    expect(result.current.items.foo).toBe('keep');

    act(() => {
      result.current.items.length = 5;
    });
    expect(result.current.items.length).toBe(5);
    expect(result.current.items.foo).toBe('keep');

    act(() => {
      result.current.items.length = 1;
    });
    expect(result.current.items.length).toBe(1);
    expect(result.current.items.foo).toBe('keep');
  });

  it('supports beyond-end assignment and index deletion in the matrix', () => {
    const { result } = renderHook(() => useReactive({ items: [1, 2] }));

    act(() => {
      result.current.items[4] = 'x';
    });
    expect(result.current.items.length).toBe(5);
    expect(2 in result.current.items).toBe(false);
    expect(4 in result.current.items).toBe(true);

    act(() => {
      delete result.current.items[4];
    });
    expect(result.current.items.length).toBe(5);
    expect(4 in result.current.items).toBe(false);
  });
});
