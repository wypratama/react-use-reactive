import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useReactive from '../index.js';

describe('own-property set/delete semantics (FIX2/FIX3/FIX4)', () => {
  it('creates a missing key assigned undefined', () => {
    const { result } = renderHook(() => useReactive({}));

    act(() => {
      result.current.foo = undefined;
    });

    expect(Object.hasOwn(result.current, 'foo')).toBe(true);
    expect('foo' in result.current).toBe(true);
    expect(Object.keys(result.current)).toEqual(['foo']);
    expect(result.current.foo).toBeUndefined();
  });

  it('treats push(undefined) as an explicit element, not a hole', () => {
    const { result } = renderHook(() => useReactive({ items: [] }));

    act(() => {
      result.current.items.push(undefined);
    });

    expect(result.current.items.length).toBe(1);
    expect(0 in result.current.items).toBe(true);
    expect(Object.hasOwn(result.current.items, '0')).toBe(true);
    expect(result.current.items[0]).toBeUndefined();
    expect(Reflect.ownKeys(result.current.items)).toContain('0');
  });

  it('treats beyond-end undefined assignment as an explicit element', () => {
    const { result } = renderHook(() => useReactive({ items: [] }));

    act(() => {
      result.current.items[5] = undefined;
    });

    expect(result.current.items.length).toBe(6);
    expect(5 in result.current.items).toBe(true);
    expect(result.current.items[5]).toBeUndefined();
  });

  it('creates foo via Object.assign with undefined', () => {
    const { result } = renderHook(() => useReactive({}));

    act(() => {
      Object.assign(result.current, { foo: undefined });
    });

    expect(Object.hasOwn(result.current, 'foo')).toBe(true);
    expect('foo' in result.current).toBe(true);
    expect(Object.keys(result.current)).toEqual(['foo']);
  });

  it('still no-ops when re-assigning an existing undefined', () => {
    const { result } = renderHook(() => useReactive({}));
    act(() => {
      result.current.foo = undefined;
    });
    const withFoo = result.current;

    act(() => {
      result.current.foo = undefined;
    });

    expect(result.current).toBe(withFoo);
  });

  it('creates an own property when shadowing an inherited key', () => {
    const { result } = renderHook(() => useReactive({}));

    act(() => {
      result.current.toString = Object.prototype.toString;
    });

    expect(Object.hasOwn(result.current, 'toString')).toBe(true);
    expect(result.current.toString).toBe(Object.prototype.toString);
    expect(Object.keys(result.current)).toContain('toString');
  });

  it('treats deleting a merely inherited key as a no-op', () => {
    const { result } = renderHook(() => useReactive({}));
    const first = result.current;

    let deleted;
    act(() => {
      deleted = delete result.current.toString;
    });

    expect(deleted).toBe(true);
    expect(result.current).toBe(first);
    expect(Object.hasOwn(result.current, 'toString')).toBe(false);
  });

  it('still deletes a real own property', () => {
    const { result } = renderHook(() => useReactive({ a: 1 }));
    const first = result.current;

    act(() => {
      delete result.current.a;
    });

    expect(result.current).not.toBe(first);
    expect('a' in result.current).toBe(false);
    expect(Object.hasOwn(result.current, 'a')).toBe(false);
  });
});
