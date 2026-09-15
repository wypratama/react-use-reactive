import { describe, expect, it } from 'vitest';
import { hydrateRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, fireEvent } from '@testing-library/react';
import useReactive from '../index.js';

/* oxlint-disable react/globals */
/* oxlint-disable react/immutability */

function Example() {
  const state = useReactive({ count: 0 });
  return (
    <>
      <span data-testid="count">{state.count}</span>
      <button onClick={() => state.count++}>increment</button>
    </>
  );
}

describe('hydration', () => {
  it('hydrates server markup and stays mutable after hydration', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(<Example />);

    let recoveries = 0;
    let root;
    act(() => {
      root = hydrateRoot(container, <Example />, {
        onRecoverableError() {
          recoveries++;
        },
      });
    });

    expect(recoveries).toBe(0);
    expect(
      container.querySelector('[data-testid="count"]').textContent
    ).toBe('0');

    act(() => {
      fireEvent.click(container.querySelector('button'));
    });

    expect(
      container.querySelector('[data-testid="count"]').textContent
    ).toBe('1');

    act(() => {
      root.unmount();
    });
  });
});