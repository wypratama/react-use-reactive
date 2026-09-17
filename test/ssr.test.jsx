// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import useReactive from '../index.js';

/* oxlint-disable react/globals */

function Example() {
  const state = useReactive({ user: { name: 'Wicak' }, count: 2 });
  return (
    <main>
      <span data-testid="name">{state.user.name}</span>
      <span>{state.count * 3}</span>
    </main>
  );
}

describe('server-side rendering (Node environment, no browser globals)', () => {
  it('runs without the jsdom environment', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
  });

  it('renders a reactive-declared component to valid HTML', () => {
    const html = renderToString(<Example />);

    expect(html).toContain('<main>');
    expect(html).toContain('>Wicak</span>');
    expect(html).toContain('>6</span>');
    expect(html).toContain('</main>');
  });

  it('renders deterministically across calls', () => {
    expect(renderToString(<Example />)).toBe(renderToString(<Example />));
  });
});