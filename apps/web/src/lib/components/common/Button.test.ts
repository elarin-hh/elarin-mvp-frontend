import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Button from './Button.svelte';

describe('Button Component', () => {
  it('renders with default props', () => {
    const { container } = render(Button, {
      props: {
        children: () => 'Click me'
      }
    });
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('renders with primary variant', () => {
    const { container } = render(Button, {
      props: {
        variant: 'primary',
        children: () => 'Primary'
      }
    });
    const button = container.querySelector('button');
    expect(button?.className).toContain('bg-primary-600');
  });

  it('can be disabled', () => {
    const { container } = render(Button, {
      props: {
        disabled: true,
        children: () => 'Disabled'
      }
    });
    const button = container.querySelector('button');
    expect(button?.disabled).toBe(true);
  });
});

