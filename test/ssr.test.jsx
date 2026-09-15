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

describe('server-side rendering', () => {
  it('renders a reactive-declared component to static markup', () => {
    const html = renderToString(<Example />);

    expect(html).toContain('Wicak');
    expect(html).toContain('>6</span>');
  });

  it('renders deterministically across calls', () => {
    expect(renderToString(<Example />)).toBe(renderToString(<Example />));
  });
});