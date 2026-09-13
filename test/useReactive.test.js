import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useReactive from '../index.js';

describe('useReactive', () => {
  describe('initialization', () => {
    it('exposes the initial top-level state', () => {
      const { result } = renderHook(() => useReactive({ count: 1 }));

      expect(result.current.count).toBe(1);
    });

    it('exposes the initial nested state', () => {
      const { result } = renderHook(() => useReactive({ nested: { value: 'a' } }));

      expect(result.current.nested.value).toBe('a');
    });
  });

  describe('mutation', () => {
    it('updates a top-level property', () => {
      const { result } = renderHook(() => useReactive({ prop: 0 }));

      act(() => {
        result.current.prop = 1;
      });

      expect(result.current.prop).toBe(1);
    });

    it('updates a nested property', () => {
      const { result } = renderHook(() => useReactive({ nested: { prop: 0 } }));

      act(() => {
        result.current.nested.prop = 1;
      });

      expect(result.current.nested.prop).toBe(1);
    });

    it('updates a deeply nested property', () => {
      const { result } = renderHook(() =>
        useReactive({ a: { b: { c: 0 } } })
      );

      act(() => {
        result.current.a.b.c = 7;
      });

      expect(result.current.a.b.c).toBe(7);
    });

    it('updates independent properties independently', () => {
      const { result } = renderHook(() => useReactive({ prop1: 0, prop2: 0 }));

      act(() => {
        result.current.prop1 = 1;
      });

      expect(result.current.prop1).toBe(1);
      expect(result.current.prop2).toBe(0);
    });

    it('updates independent nested properties independently', () => {
      const { result } = renderHook(() =>
        useReactive({ nested1: { prop: 0 }, nested2: { prop: 0 } })
      );

      act(() => {
        result.current.nested1.prop = 1;
      });

      expect(result.current.nested1.prop).toBe(1);
      expect(result.current.nested2.prop).toBe(0);
    });
  });

  describe('nested object replacement', () => {
    it('replaces a top-level property with an object', () => {
      const { result } = renderHook(() => useReactive({ child: { v: 1 } }));

      act(() => {
        result.current.child = { v: 2 };
      });

      expect(result.current.child).toEqual({ v: 2 });
    });

    it('keeps a freshly assigned object reactive', () => {
      const { result } = renderHook(() => useReactive({ child: {} }));

      act(() => {
        result.current.child = { x: 0 };
        result.current.child.x = 42;
      });

      expect(result.current.child.x).toBe(42);
    });

    it('keeps a previously held nested reference reactive', () => {
      const { result } = renderHook(() => useReactive({ nested: { n: 0 } }));
      const held = result.current.nested;

      act(() => {
        held.n = 5;
      });

      expect(result.current.nested.n).toBe(5);
    });
  });

  describe('arrays', () => {
    it('assigns an item by index', () => {
      const { result } = renderHook(() => useReactive({ items: [1, 2, 3] }));

      act(() => {
        result.current.items[1] = 99;
      });

      expect(result.current.items).toEqual([1, 99, 3]);
    });

    it('pushes a new item', () => {
      const { result } = renderHook(() => useReactive({ items: [] }));

      act(() => {
        result.current.items.push('a');
      });

      expect(result.current.items).toEqual(['a']);
    });

    it('removes an item with splice', () => {
      const { result } = renderHook(() =>
        useReactive({ items: ['a', 'b', 'c'] })
      );

      act(() => {
        result.current.items.splice(1, 1);
      });

      expect(result.current.items).toEqual(['a', 'c']);
    });
  });

  describe('rendering', () => {
    it('re-renders the component after a mutation', () => {
      let renders = 0;
      const { result } = renderHook(() => {
        renders++;
        return useReactive({ count: 0 });
      });

      act(() => {
        result.current.count++;
      });

      expect(renders).toBe(2);
    });

    it('does not re-render on read access', () => {
      let renders = 0;
      const { result } = renderHook(() => {
        renders++;
        return useReactive({ count: 0 });
      });

      void result.current.count;

      expect(renders).toBe(1);
    });
  });
});
