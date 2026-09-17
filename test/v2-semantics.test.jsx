import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useReactive from '../index.js';

describe('frozen reference semantics: root vs nested, stale, aliasing (FIX13/FIX14/FIX15/FIX16/FIX17)', () => {
  it('documents that a held writer keeps identity while fresh reads follow data', () => {
    const { result } = renderHook(() => useReactive({ nested: { n: 0 } }));
    const held = result.current.nested;

    act(() => {
      held.n = 5;
    });

    // Fresh path follows the new data version; the writer keeps its identity.
    expect(result.current.nested.n).toBe(5);
    expect(held.n).toBe(5);
    expect(held).not.toBe(result.current.nested);
  });

  it('keeps old root proxies following live state while old nested proxies freeze', () => {
    const { result } = renderHook(() =>
      useReactive({ obj: { v: 1 }, count: 0 })
    );
    const oldRoot = result.current;
    const staleNested = result.current.obj;

    act(() => {
      result.current.obj = { v: 2 };
    });

    // Root handles always resolve to the live tree.
    expect(oldRoot.obj.v).toBe(2);
    // Nested handles are path/logical-node bound and freeze on replacement.
    expect(staleNested.v).toBe(1);

    act(() => {
      oldRoot.count = 7;
    });
    expect(result.current.count).toBe(7);
  });

  it('treats removed array elements as frozen path-bound references', () => {
    const { result } = renderHook(() =>
      useReactive({ items: [{ v: 1 }, { v: 2 }] })
    );
    let removed;
    act(() => {
      removed = result.current.items.pop();
    });

    expect(removed.v).toBe(2);

    act(() => {
      removed.v = 99;
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].v).toBe(1);
    expect(removed.v).toBe(2);
  });

  it('reports stale writes as success at the Proxy level while ignoring them', () => {
    const { result } = renderHook(() =>
      useReactive({ obj: { v: 1 }, count: 0 })
    );
    const stale = result.current.obj;

    act(() => {
      result.current.obj = { v: 2 };
    });

    let outcome;
    act(() => {
      outcome = Reflect.set(stale, 'v', 99);
    });

    expect(outcome).toBe(true);
    expect(result.current.obj.v).toBe(2);
    expect(stale.v).toBe(1);
  });

  it('returns live reactive references on read-out (not snapshots)', () => {
    const { result } = renderHook(() =>
      useReactive({ user: { name: 'a' }, items: [{ v: 1 }] })
    );

    const copy = { ...result.current };
    expect(copy.user).toBe(result.current.user);

    const sliced = result.current.items.slice();
    const mapped = result.current.items.map((x) => x);
    expect(sliced[0]).toBe(result.current.items[0]);
    expect(mapped[0]).toBe(result.current.items[0]);

    // Assignment INTO state copies; reading OUT aliases (documented).
    act(() => {
      copy.user.name = 'mutated';
    });
    expect(result.current.user.name).toBe('mutated');
  });

  it('applies multi-step built-ins sequentially: earlier writes survive a later rejection', () => {
    const { result } = renderHook(() =>
      useReactive({ user: { name: 'a' } })
    );
    const cyclic = { a: 1 };
    cyclic.self = cyclic;

    expect(() => {
      act(() => {
        Object.assign(result.current.user, { name: 'good', bad: cyclic });
      });
    }).toThrow('does not support cyclic');

    // Mirrors sequential JS semantics: the first write already applied.
    expect(result.current.user.name).toBe('good');
    expect('bad' in result.current.user).toBe(false);

    // The tree stays internally valid afterwards.
    act(() => {
      result.current.user.name = 'fine';
    });
    expect(result.current.user.name).toBe('fine');
  });

  it('does not partially attach a rejected single-property assignment', () => {
    const { result } = renderHook(() => useReactive({ obj: { v: 1 } }));
    const cyclic = { a: 1 };
    cyclic.self = cyclic;

    expect(() => {
      act(() => {
        result.current.obj = cyclic;
      });
    }).toThrow('does not support cyclic');

    expect(result.current.obj).toEqual({ v: 1 });
  });

  it('leaves the tree valid after a rejected splice payload', () => {
    const { result } = renderHook(() =>
      useReactive({ items: ['a'] })
    );
    const cyclic = { ok: 1 };
    cyclic.self = cyclic;

    expect(() => {
      act(() => {
        result.current.items.splice(0, 0, { ok: 1 }, cyclic);
      });
    }).toThrow('does not support cyclic');

    // Earlier sequential inserts may have applied; the tree must stay usable.
    act(() => {
      result.current.items.push('z');
    });
    expect(result.current.items).toContain('z');
    expect(result.current.items.length).toBeGreaterThan(0);
  });
});
