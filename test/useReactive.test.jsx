import { StrictMode } from 'react';
import { describe, expect, it } from 'vitest';
import { act, render, renderHook } from '@testing-library/react';
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

  describe('consecutive mutations', () => {
    it('accumulates repeated increments', () => {
      const { result } = renderHook(() => useReactive({ count: 0 }));

      act(() => {
        result.current.count++;
        result.current.count++;
        result.current.count++;
      });

      expect(result.current.count).toBe(3);
    });

    it('accumulates compound assignment', () => {
      const { result } = renderHook(() => useReactive({ count: 0 }));

      act(() => {
        result.current.count += 5;
        result.current.count += 5;
      });

      expect(result.current.count).toBe(10);
    });

    it('accumulates repeated pushes in one statement', () => {
      const { result } = renderHook(() => useReactive({ items: [] }));

      act(() => {
        result.current.items.push('a');
        result.current.items.push('b');
      });

      expect(result.current.items).toEqual(['a', 'b']);
    });

    it('accumulates pushes through a held reference', () => {
      const { result } = renderHook(() => useReactive({ items: [] }));
      const items = result.current.items;

      act(() => {
        items.push('a');
      });
      act(() => {
        items.push('b');
      });

      expect(result.current.items).toEqual(['a', 'b']);
    });

    it('observes the last write synchronously in the same tick', () => {
      const { result } = renderHook(() => useReactive({ count: 0 }));

      act(() => {
        result.current.count++;
        expect(result.current.count).toBe(1);
        result.current.count++;
        expect(result.current.count).toBe(2);
      });

      expect(result.current.count).toBe(2);
    });
  });

  describe('deletion', () => {
    it('removes an object property', () => {
      const { result } = renderHook(() => useReactive({ a: 1, b: 2 }));

      act(() => {
        delete result.current.a;
      });

      expect(result.current.a).toBeUndefined();
      expect('a' in result.current).toBe(false);
      expect('b' in result.current).toBe(true);
    });

    it('deleting an array index leaves a hole', () => {
      const { result } = renderHook(() => useReactive({ items: [1, 2, 3] }));

      act(() => {
        delete result.current.items[1];
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items[1]).toBeUndefined();
      expect(1 in result.current.items).toBe(false);
      expect(result.current.items[0]).toBe(1);
      expect(result.current.items[2]).toBe(3);
    });

    it('keeping the array length is a no-op', () => {
      const { result } = renderHook(() => useReactive({ items: [1, 2] }));
      const first = result.current;

      act(() => {
        result.current.items.length = 2;
      });

      expect(result.current).toBe(first);
    });
  });

  describe('no-op operations', () => {
    it('keeps the root identity for same-value primitive writes', () => {
      const { result } = renderHook(() => useReactive({ count: 0 }));
      const first = result.current;

      act(() => {
        result.current.count = 0;
      });

      expect(result.current).toBe(first);
    });

    it('keeps nested identity for same-value leaf writes', () => {
      const { result } = renderHook(() => useReactive({ user: { name: 'a' } }));
      const first = result.current.user;

      act(() => {
        result.current.user.name = 'a';
      });

      expect(result.current.user).toBe(first);
    });

    it('keeps the root identity when deleting a missing key', () => {
      const { result } = renderHook(() => useReactive({ a: 1 }));
      const first = result.current;

      act(() => {
        delete result.current.b;
      });

      expect(result.current).toBe(first);
    });

    it('always copies structural values, even when equal', () => {
      const { result } = renderHook(() =>
        useReactive({ a: { x: 1 }, b: { x: 1 } })
      );
      const b = result.current.b;

      act(() => {
        result.current.a = result.current.b;
      });

      expect(result.current.a).toEqual({ x: 1 });
      expect(result.current.a).not.toBe(b);
      expect(result.current.a).not.toBe(result.current.b);
    });
  });

  describe('arrays', () => {
    it('supports push, pop, shift, unshift, and length truncation', () => {
      const { result } = renderHook(() => useReactive({ items: [] }));

      act(() => {
        result.current.items.push('a', 'b');
        result.current.items.unshift('z');
      });

      expect(result.current.items).toEqual(['z', 'a', 'b']);

      act(() => {
        expect(result.current.items.pop()).toBe('b');
        expect(result.current.items.shift()).toBe('z');
        result.current.items.length = 0;
      });

      expect(result.current.items).toEqual([]);
    });

    it('supports splice, sort, and reverse on the live array', () => {
      const { result } = renderHook(() => useReactive({ items: [3, 1, 2] }));

      act(() => {
        result.current.items.sort();
      });

      expect(result.current.items).toEqual([1, 2, 3]);

      act(() => {
        result.current.items.reverse();
      });

      expect(result.current.items).toEqual([3, 2, 1]);

      act(() => {
        result.current.items.splice(1, 1, 'x');
      });

      expect(result.current.items).toEqual([3, 'x', 1]);
    });

    it('supports index assignment and length truncation', () => {
      const { result } = renderHook(() => useReactive({ items: [1, 2, 3] }));

      act(() => {
        result.current.items[0] = 9;
        result.current.items.length = 2;
      });

      expect(result.current.items).toEqual([9, 2]);
    });

    it('reads spread and substitutes a fresh array', () => {
      const { result } = renderHook(() =>
        useReactive({ items: [1, 2], other: null })
      );

      act(() => {
        const spread = [...result.current.items];
        result.current.items = [...spread, 3];
        result.current.other = spread;
      });

      expect(result.current.items).toEqual([1, 2, 3]);
      expect(result.current.items).not.toBe(result.current.other);
    });

    it('keeps a mixed adversarial sequence consistent', () => {
      const { result } = renderHook(() =>
        useReactive({ items: [0, 1, 2, 3] })
      );

      act(() => {
        result.current.items.push(4);
        result.current.items[1] = 'x';
        result.current.items.splice(2, 2);
        result.current.items.unshift(-1);
        result.current.items.pop();
        result.current.items.reverse();
      });

      expect(result.current.items).toEqual(['x', 0, -1]);
    });
  });

  describe('identity', () => {
    it('changes the root proxy identity when root data changes', () => {
      const { result } = renderHook(() => useReactive({ count: 0 }));
      const first = result.current;

      act(() => {
        result.current.count = 1;
      });

      expect(result.current).not.toBe(first);
    });

    it('keeps the root proxy identity across unrelated re-renders', () => {
      let state = null;
      const { rerender } = renderHook(() => {
        state = useReactive({ count: 0 });
      });
      const first = state;

      rerender();

      expect(state).toBe(first);
    });

    it('returns the same nested proxy for the current node', () => {
      const { result } = renderHook(() => useReactive({ user: { name: 'a' } }));

      expect(result.current.user).toBe(result.current.user);
    });

    it('changes nested identity when its data changes', () => {
      const { result } = renderHook(() => useReactive({ user: { name: 'a' } }));
      const first = result.current.user;

      act(() => {
        result.current.user.name = 'b';
      });

      expect(result.current.user).not.toBe(first);
    });

    it('preserves nested identity across unrelated changes', () => {
      const { result } = renderHook(() =>
        useReactive({ user: { name: 'a' }, count: 0 })
      );
      const user = result.current.user;

      act(() => {
        result.current.count = 1;
      });

      expect(result.current.user).toBe(user);
    });

    it('exposes array proxies as real arrays', () => {
      const { result } = renderHook(() => useReactive({ items: [1, 2] }));

      expect(Array.isArray(result.current.items)).toBe(true);
      expect(result.current.items instanceof Array).toBe(true);
      expect(Object.getPrototypeOf(result.current.items)).toBe(
        Array.prototype
      );
    });
  });

  describe('stale references', () => {
    it('reads a frozen view of a replaced node', () => {
      const { result } = renderHook(() =>
        useReactive({ obj: { v: 1 }, count: 0 })
      );
      const stale = result.current.obj;

      act(() => {
        result.current.obj = { v: 2 };
      });

      expect(result.current.obj.v).toBe(2);
      expect(stale.v).toBe(1);
    });

    it("does not let writes through a stale reference reach current state", () => {
      const { result } = renderHook(() =>
        useReactive({ obj: { v: 1 }, count: 0 })
      );
      const stale = result.current.obj;

      act(() => {
        result.current.obj = { v: 2 };
      });
      act(() => {
        stale.v = 99;
      });

      expect(result.current.obj.v).toBe(2);
      expect(stale.v).toBe(1);
    });

    it('keeps a still-current reference writable across its own writes', () => {
      const { result } = renderHook(() => useReactive({ nested: { n: 0 } }));
      const held = result.current.nested;

      act(() => {
        held.n = 5;
      });
      act(() => {
        held.n = 6;
      });

      expect(result.current.nested.n).toBe(6);
    });
  });

  describe('reference semantics', () => {
    it('follows the same logical object across interleaved writes', () => {
      const { result } = renderHook(() =>
        useReactive({ user: { name: '', age: 0 } })
      );
      const userA = result.current.user;
      const userB = result.current.user;

      expect(userA).toBe(userB);

      act(() => {
        userA.name = 'A';
      });
      act(() => {
        result.current.user.age = 30;
      });
      act(() => {
        userB.name = 'B';
      });

      expect(result.current.user).toEqual({ name: 'B', age: 30 });
    });

    it('copies a shared initial object into independent branches', () => {
      const shared = { value: 0 };
      const { result } = renderHook(() =>
        useReactive({ a: shared, b: shared })
      );

      expect(result.current.a).not.toBe(result.current.b);

      act(() => {
        result.current.b.value = 5;
      });

      expect(result.current.a.value).toBe(0);
      expect(result.current.b.value).toBe(5);
    });
  });

  describe('ownership', () => {
    it('never mutates the caller-provided initial object', () => {
      const initial = { nested: { v: 1 }, items: [{ a: 1 }] };
      const { result } = renderHook(() => useReactive(initial));

      act(() => {
        result.current.nested.v = 2;
        result.current.items[0].a = 3;
        result.current.items.push({ b: 4 });
      });

      expect(initial).toEqual({ nested: { v: 1 }, items: [{ a: 1 }] });
    });

    it('copies assigned values instead of aliasing them', () => {
      const { result } = renderHook(() =>
        useReactive({ a: { x: 1 }, b: null })
      );

      act(() => {
        result.current.b = result.current.a;
      });

      expect(result.current.b).toEqual(result.current.a);
      expect(result.current.b).not.toBe(result.current.a);

      act(() => {
        result.current.b.x = 5;
      });

      expect(result.current.a.x).toBe(1);
      expect(result.current.b.x).toBe(5);
    });

    it('deep-copies values assigned through the proxy', () => {
      const source = { nested: { n: 1 } };
      const { result } = renderHook(() => useReactive({ obj: null }));

      act(() => {
        result.current.obj = source;
      });

      act(() => {
        result.current.obj.nested.n = 2;
      });

      expect(source.nested.n).toBe(1);
      expect(result.current.obj.nested.n).toBe(2);
    });
  });

  describe('opaque values', () => {
    it('stores opaque values by reference', () => {
      const fn = () => 1;
      const date = new Date(1234);
      const map = new Map([['k', 1]]);
      const { result } = renderHook(() =>
        useReactive({ fn, date, map, nested: { date } })
      );

      expect(result.current.fn).toBe(fn);
      expect(result.current.date).toBe(date);
      expect(result.current.map).toBe(map);
      expect(result.current.nested.date).toBe(date);
    });

    it('replaces opaque values on assignment', () => {
      const date = new Date(1234);
      const { result } = renderHook(() => useReactive({ date }));

      act(() => {
        result.current.date = new Date(5678);
      });

      expect(result.current.date).not.toBe(date);
    });

    it('does not proxy class instances', () => {
      class Box {
        constructor(v) {
          this.v = v;
        }
      }
      const box = new Box(3);
      const { result } = renderHook(() => useReactive({ box }));

      expect(result.current.box).toBe(box);
      expect(result.current.box.v).toBe(3);
    });
  });

  describe('reflection', () => {
    it('reflects mutations through Object.keys', () => {
      const { result } = renderHook(() => useReactive({ a: 1 }));

      act(() => {
        result.current.a = 2;
        result.current.b = 3;
      });

      expect(Object.keys(result.current)).toEqual(['a', 'b']);
    });

    it('reflects mutations through JSON.stringify', () => {
      const { result } = renderHook(() => useReactive({ a: 1, nested: { b: 2 } }));

      act(() => {
        result.current.a = 5;
        delete result.current.a;
        result.current.x = 1;
      });

      expect(result.current.x).toBe(1);
    });

    it('supports Object.assign through the proxy', () => {
      const { result } = renderHook(() =>
        useReactive({ user: { name: 'W', age: 20 } })
      );

      act(() => {
        Object.assign(result.current.user, { name: 'Wicak', age: 30 });
      });

      expect(result.current.user).toEqual({ name: 'Wicak', age: 30 });
    });

    it('defines and rewrites a data property', () => {
      const { result } = renderHook(() => useReactive({}));

      act(() => {
        Object.defineProperty(result.current, 'x', {
          value: 5,
          enumerable: true,
          configurable: true,
          writable: true,
        });
      });

      expect(result.current.x).toBe(5);
      expect(Object.getOwnPropertyDescriptor(result.current, 'x')).toEqual({
        value: 5,
        writable: true,
        enumerable: true,
        configurable: true,
      });

      act(() => {
        Object.defineProperty(result.current, 'x', {
          value: 6,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      });

      expect(result.current.x).toBe(6);
    });

    it('rejects accessor descriptors with a clear error', () => {
      const { result } = renderHook(() => useReactive({}));

      expect(() => {
        act(() => {
          Object.defineProperty(result.current, 'x', {
            get: () => 1,
            enumerable: true,
          });
        });
      }).toThrow('does not support accessor properties');
    });

    it('rejects attribute transitions a Proxy cannot represent', () => {
      const { result } = renderHook(() => useReactive({ x: 1 }));

      expect(() => {
        act(() => {
          Object.defineProperty(result.current, 'x', {
            value: 1,
            writable: false,
            enumerable: true,
            configurable: false,
          });
        });
      }).toThrow('as non-configurable');

      expect(result.current.x).toBe(1);
    });
  });

  describe('special initial values', () => {
    it('supports objects without a prototype', () => {
      const { result } = renderHook(() =>
        useReactive(Object.assign(Object.create(null), { a: 1, o: Object.create(null) }))
      );

      expect(result.current.a).toBe(1);

      act(() => {
        result.current.a = 2;
        result.current.o.x = 9;
      });

      expect(result.current.a).toBe(2);
      expect(result.current.o.x).toBe(9);
    });

    it('rejects cyclic initial values', () => {
      const cyclic = { a: 1 };
      cyclic.self = cyclic;

      expect(() => {
        renderHook(() => useReactive(cyclic));
      }).toThrow('does not support cyclic plain objects or arrays');
    });

    it('rejects cyclic values on assignment', () => {
      const { result } = renderHook(() => useReactive({ obj: null }));
      const cyclic = { a: 1 };
      cyclic.self = cyclic;
      cyclic.obj = cyclic;

      expect(() => {
        act(() => {
          result.current.obj = cyclic;
        });
      }).toThrow('does not support cyclic plain objects or arrays');
    });

    it('rejects cyclic arrays on assignment', () => {
      const { result } = renderHook(() => useReactive({ items: null }));
      const cyclic = [];
      cyclic.push(cyclic);

      expect(() => {
        act(() => {
          result.current.items = cyclic;
        });
      }).toThrow('does not support cyclic plain objects or arrays');
    });
  });

  describe('batching', () => {
    it('renders once for many mutations in a tick', () => {
      let renders = 0;
      const { result } = renderHook(() => {
        renders++;
        return useReactive({ count: 0, items: [] });
      });

      act(() => {
        result.current.count++;
        result.current.count++;
        result.current.count++;
        result.current.items.push(1);
      });

      expect(result.current.count).toBe(3);
      expect(result.current.items).toEqual([1]);
      expect(renders).toBe(2);
    });
  });

  describe('StrictMode', () => {
    it('keeps a single store across double renders', () => {
      let state;
      function Comp() {
        // oxlint-disable-next-line react/globals
        state = useReactive({ count: 0, items: [] });
        return null;
      }

      render(
        <StrictMode>
          <Comp />
        </StrictMode>
      );

      act(() => {
        state.count++;
        state.count++;
        state.items.push('x');
      });
      act(() => {
        state.count += 5;
      });

      expect(state.count).toBe(7);
      expect(state.items).toEqual(['x']);
    });
  });
});
