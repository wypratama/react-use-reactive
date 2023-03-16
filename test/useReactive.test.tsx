import { act, render } from '@testing-library/react';
import useReactive from '../src/index';
import React from 'react';

describe('useReactive', () => {
  test('should set reactive object', () => {
    let result: ReturnType<typeof useReactive<{ x: number }>> | null = null;
    const TestComponent = () => {
      result = useReactive({ x: 1 });
      return null;
    };

    render(<TestComponent />);

    expect(result!.x).toBe(1);

    act(() => {
      result!.x = 2;
    });

    expect(result!.x).toBe(2);
  });

  test('should handle nested object', () => {
    let result: ReturnType<typeof useReactive<{
      a: {
        b: {
          c: number,
        },
      },
    }>> | null = null;
    const TestComponent = () => {
      result = useReactive({
        a: {
          b: {
            c: 1,
          },
        },
      });
      return null;
    };

    render(<TestComponent />);

    act(() => {
      result!.a.b.c = 2;
    });

    expect(result!.a.b.c).toBe(2);
  });
});
