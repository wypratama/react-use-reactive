import { memo, useMemo, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { act, render, renderHook } from '@testing-library/react';
import useReactive from '../index.js';

/* oxlint-disable react/globals */
/* oxlint-disable react/immutability */

let holder;

describe('adversarial review probes', () => {
  describe('useMemo', () => {
    it('recomputes [state]-keyed memo after state.count++', () => {
      holder = { state: null, doubled: 0 };
      function Comp() {
        const state = useReactive({ count: 0 });
        holder.state = state;
        holder.doubled = useMemo(() => state.count * 2, [state]);
        return null;
      }
      render(<Comp />);
      expect(holder.doubled).toBe(0);

      act(() => {
        holder.state.count++;
      });

      expect(holder.doubled).toBe(2);
    });

    it('recomputes [state.user]-keyed memo after user.name changes', () => {
      holder = { state: null, name: null };
      function Comp() {
        const state = useReactive({ user: { name: 'a' } });
        holder.state = state;
        holder.name = useMemo(() => state.user.name, [state.user]);
        return null;
      }
      render(<Comp />);
      expect(holder.name).toBe('a');

      act(() => {
        holder.state.user.name = 'New';
      });

      expect(holder.name).toBe('New');
    });
  });

  describe('React.memo', () => {
    it('re-renders a memoized child that receives the root state', () => {
      holder = { state: null, childRenders: 0 };
      const Child = memo(function Child({ state }) {
        holder.childRenders++;
        return <span>{state.count}</span>;
      });

      function Parent() {
        const state = useReactive({ count: 0 });
        holder.state = state;
        return <Child state={state} />;
      }

      render(<Parent />);
      expect(holder.childRenders).toBe(1);

      act(() => {
        holder.state.count++;
      });

      expect(holder.childRenders).toBe(2);
    });

    it('re-renders a memoized child when only its nested prop changes', () => {
      holder = { state: null, childRenders: 0 };
      const Child = memo(function Child({ user }) {
        holder.childRenders++;
        return <span>{user.name}</span>;
      });

      function Parent() {
        const state = useReactive({ user: { name: 'a' } });
        holder.state = state;
        return <Child user={state.user} />;
      }

      render(<Parent />);
      expect(holder.childRenders).toBe(1);

      act(() => {
        holder.state.user.name = 'b';
      });

      expect(holder.childRenders).toBe(2);
    });

    it('skips a memoized child when an unrelated sibling changes', () => {
      holder = { state: null, childRenders: 0 };
      const Child = memo(function Child({ user }) {
        holder.childRenders++;
        return <span>{user.name}</span>;
      });

      function Parent() {
        const state = useReactive({ user: { name: 'a' }, count: 0 });
        holder.state = state;
        return <Child user={state.user} />;
      }

      render(<Parent />);
      expect(holder.childRenders).toBe(1);

      act(() => {
        holder.state.count = 9;
      });

      expect(holder.childRenders).toBe(1);
    });
  });

  describe('identity', () => {
    it('changes the root proxy identity when root data changes', () => {
      const { result } = renderHook(() => useReactive({ count: 0 }));
      const before = result.current;

      act(() => {
        result.current.count = 1;
      });

      expect(result.current).not.toBe(before);
    });

    it('keeps the root proxy identity across unrelated re-renders', () => {
      holder = { state: null, setTick: null };
      function Comp() {
        const [tick, setTick] = useState(0);
        const state = useReactive({ count: 0 });
        holder.state = state;
        holder.setTick = setTick;
        return tick;
      }
      render(<Comp />);
      const first = holder.state;

      act(() => {
        holder.setTick(1);
      });

      expect(holder.state).toBe(first);
    });

    it('keeps nested proxy identity across unrelated re-renders', () => {
      holder = { state: null, setTick: null };
      function Comp() {
        const [tick, setTick] = useState(0);
        const state = useReactive({ user: { name: 'a' } });
        holder.state = state;
        holder.setTick = setTick;
        return tick;
      }
      render(<Comp />);
      const first = holder.state.user;

      act(() => {
        holder.setTick(1);
      });

      expect(holder.state.user).toBe(first);
    });
  });

  describe('held references', () => {
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

    it('becomes frozen only when the node is replaced', () => {
      const { result } = renderHook(() => useReactive({ obj: { v: 1 } }));
      const stale = result.current.obj;

      act(() => {
        result.current.obj = { v: 2 };
      });

      expect(result.current.obj.v).toBe(2);
      expect(stale.v).toBe(1);

      act(() => {
        stale.v = 99;
      });

      expect(result.current.obj.v).toBe(2);
    });
  });

  describe('shared references', () => {
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

  describe('cycles', () => {
    it('supports cyclic init with readable, mutable self references', () => {
      const cyclic = { a: 1 };
      cyclic.self = cyclic;
      const { result } = renderHook(() => useReactive(cyclic));

      expect(result.current.self.self.self.a).toBe(1);

      act(() => {
        result.current.self.a = 2;
      });

      expect(result.current.self.a).toBe(2);
      expect(result.current.a).toBe(2);
    });
  });
});