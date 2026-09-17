import { memo, useMemo } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import useReactive from '../index.js';

/* oxlint-disable react/globals */
/* oxlint-disable react/immutability */

afterEach(cleanup);

describe('React memoization integration', () => {
  describe('useMemo', () => {
    it('recomputes a [state]-keyed memo when state data changes', () => {
      const memoRenders = vi.fn();
      function Example() {
        const state = useReactive({ count: 0 });
        const doubled = useMemo(() => {
          memoRenders();
          return state.count * 2;
        }, [state]);

        return (
          <>
            <span data-testid="value">{doubled}</span>
            <button onClick={() => state.count++}>increment</button>
          </>
        );
      }

      render(<Example />);
      expect(screen.getByTestId('value').textContent).toBe('0');
      expect(memoRenders).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('increment'));
      expect(screen.getByTestId('value').textContent).toBe('2');

      fireEvent.click(screen.getByText('increment'));
      expect(screen.getByTestId('value').textContent).toBe('4');
      expect(memoRenders).toHaveBeenCalledTimes(3);
    });

    it('recomputes a [state.user]-keyed memo when user data changes', () => {
      function Example() {
        const state = useReactive({ user: { name: 'a' } });
        const name = useMemo(() => state.user.name, [state.user]);

        return (
          <>
            <span data-testid="name">{name}</span>
            <button onClick={() => (state.user.name = 'b')}>rename</button>
          </>
        );
      }

      render(<Example />);
      expect(screen.getByTestId('name').textContent).toBe('a');

      fireEvent.click(screen.getByText('rename'));
      expect(screen.getByTestId('name').textContent).toBe('b');
    });

    it('does not recompute a [state.user]-keyed memo on an unrelated change', () => {
      const componentRenders = vi.fn();
      const memoRenders = vi.fn();
      function Example() {
        const state = useReactive({ user: { name: 'a' }, count: 0 });
        componentRenders();
        const name = useMemo(() => {
          memoRenders();
          return state.user.name;
        }, [state.user]);

        return (
          <>
            <span data-testid="name">{name}</span>
            <button onClick={() => (state.count += 1)}>bump</button>
          </>
        );
      }

      render(<Example />);
      expect(memoRenders).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('bump'));

      expect(componentRenders).toHaveBeenCalledTimes(2);
      expect(memoRenders).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('name').textContent).toBe('a');
    });
  });

  describe('React.memo', () => {
    it('re-renders a memoized child that receives a root-state prop', () => {
      const childRenders = vi.fn();
      const Child = memo(function Child({ state }) {
        childRenders();
        return <span data-testid="count">{state.count}</span>;
      });

      function Parent() {
        const state = useReactive({ count: 0 });
        return (
          <>
            <button onClick={() => state.count++}>increment</button>
            <Child state={state} />
          </>
        );
      }

      render(<Parent />);
      expect(childRenders).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('count').textContent).toBe('0');

      fireEvent.click(screen.getByText('increment'));
      expect(childRenders).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('count').textContent).toBe('1');
    });

    it('re-renders a memoized child when only its nested prop changes', () => {
      const childRenders = vi.fn();
      const Child = memo(function Child({ user }) {
        childRenders();
        return <span data-testid="name">{user.name}</span>;
      });

      function Parent() {
        const state = useReactive({ user: { name: 'a' } });
        return (
          <>
            <button onClick={() => (state.user.name = 'b')}>rename</button>
            <Child user={state.user} />
          </>
        );
      }

      render(<Parent />);
      expect(childRenders).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('rename'));
      expect(childRenders).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('name').textContent).toBe('b');
    });

    it('skips a memoized child when an unrelated sibling changes', () => {
      const childRenders = vi.fn();
      const Child = memo(function Child({ user }) {
        childRenders();
        return <span data-testid="name">{user.name}</span>;
      });

      function Parent() {
        const state = useReactive({ user: { name: 'a' }, count: 0 });
        return (
          <>
            <button onClick={() => (state.count += 1)}>bump</button>
            <Child user={state.user} />
          </>
        );
      }

      render(<Parent />);
      expect(childRenders).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('bump'));
      expect(childRenders).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('name').textContent).toBe('a');
    });
  });
});