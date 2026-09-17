import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useReactive from '../index.js';

describe('descriptor raw-node escape (FIX1/FIX18)', () => {
  it('exposes structural descriptor values as reactive proxies, not raw nodes', () => {
    const { result } = renderHook(() => useReactive({ user: { name: 'a' } }));
    const first = result.current;
    const descriptor = Object.getOwnPropertyDescriptor(first, 'user');

    expect(descriptor).toBeDefined();
    expect(descriptor?.enumerable).toBe(true);
    expect(descriptor?.configurable).toBe(true);
    // Consistent with ordinary property access.
    expect(descriptor?.value).toBe(first.user);
  });

  it('routes mutations through descriptor values via the reactive mechanism', () => {
    const { result } = renderHook(() => useReactive({ user: { name: 'a' } }));
    const first = result.current;
    const descriptor = Object.getOwnPropertyDescriptor(first, 'user');

    act(() => {
      descriptor.value.name = 'HACKED';
    });

    // Must have committed a new version (not a silent in-place raw mutation).
    expect(result.current).not.toBe(first);
    expect(result.current.user.name).toBe('HACKED');
  });

  it('wraps values from getOwnPropertyDescriptors too', () => {
    const { result } = renderHook(() => useReactive({ user: { name: 'a' } }));
    const first = result.current;
    const descriptors = Object.getOwnPropertyDescriptors(first);

    expect(descriptors.user.value).toBe(first.user);

    act(() => {
      descriptors.user.value.name = 'b';
    });

    expect(result.current).not.toBe(first);
    expect(result.current.user.name).toBe('b');
  });

  it('wraps array element descriptor values', () => {
    const { result } = renderHook(() =>
      useReactive({ items: [{ v: 1 }] })
    );
    const first = result.current;
    const descriptor = Object.getOwnPropertyDescriptor(first.items, '0');

    expect(descriptor?.value).toBe(first.items[0]);

    act(() => {
      descriptor.value.v = 'HACKED';
    });

    expect(result.current).not.toBe(first);
    expect(result.current.items[0].v).toBe('HACKED');
  });

  it('reflects later mutations through fresh descriptors', () => {
    const { result } = renderHook(() => useReactive({ user: { name: 'a' } }));

    act(() => {
      result.current.user.name = 'b';
    });

    const descriptor = Object.getOwnPropertyDescriptor(result.current, 'user');
    expect(descriptor?.value).toBe(result.current.user);
    expect(descriptor?.value.name).toBe('b');
  });

  it('keeps opaque leaves opaque through descriptors', () => {
    const date = new Date(1234);
    const { result } = renderHook(() => useReactive({ date, count: 1 }));
    const descriptor = Object.getOwnPropertyDescriptor(result.current, 'date');

    expect(descriptor?.value).toBe(date);
  });

  it('keeps the full reflection matrix consistent and invariant-safe', () => {
    const sym = Symbol('s');
    const { result } = renderHook(() =>
      useReactive({ user: { name: 'a' }, count: 1, [sym]: { v: 1 } })
    );

    expect(() => Object.keys(result.current)).not.toThrow();
    expect(() => Object.values(result.current)).not.toThrow();
    expect(() => Object.entries(result.current)).not.toThrow();
    expect(() => Reflect.ownKeys(result.current)).not.toThrow();
    expect(() =>
      Object.getOwnPropertyDescriptor(result.current, 'user')
    ).not.toThrow();
    expect(() =>
      Object.getOwnPropertyDescriptors(result.current)
    ).not.toThrow();
    expect(() => JSON.stringify(result.current)).not.toThrow();
    expect(() => {
      let seen = 0;
      for (const _key in result.current) {
        seen++;
      }
      return seen;
    }).not.toThrow();

    expect(Object.hasOwn(result.current, 'user')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(result.current, 'user')).toBe(
      true
    );
    expect(JSON.parse(JSON.stringify(result.current)).user).toEqual({
      name: 'a',
    });
    // Symbol structural values stay reactive through descriptors as well.
    const symDescriptor = Object.getOwnPropertyDescriptor(
      result.current,
      sym
    );
    expect(symDescriptor?.value).toBe(result.current[sym]);
  });
});
