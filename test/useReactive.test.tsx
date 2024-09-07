import { renderHook, act } from '@testing-library/react-hooks';
import useReactive from '../src/index';
import structuredClone from '@ungap/structured-clone';

beforeAll(() => {
  // Attach the polyfill as a Global function
  if (!('structuredClone' in globalThis)) {
    globalThis.structuredClone = structuredClone as any;
  }
});

describe('useReactive', () => {
  it('should update a single property', () => {
    const { result } = renderHook(() => useReactive({ prop: 0 }));

    act(() => {
      result.current.prop = 1;
    });

    expect(result.current.prop).toBe(1);
  });

  it('should update a nested property', () => {
    const { result } = renderHook(() => useReactive({ nested: { prop: 0 } }));

    act(() => {
      result.current.nested.prop = 1;
    });

    expect(result.current.nested.prop).toBe(1);
  });

  it('should update properties independently', () => {
    const { result } = renderHook(() => useReactive({ prop1: 0, prop2: 0 }));

    act(() => {
      result.current.prop1 = 1;
    });

    expect(result.current.prop1).toBe(1);
    expect(result.current.prop2).toBe(0);
  });

  it('should update nested properties independently', () => {
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
