import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge Component', () => {
  it('renders correctly with default variant', () => {
    render(<Badge>Default Badge</Badge>);
    const badge = screen.getByText('Default Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-white/10');
  });

  it('renders correctly with success variant', () => {
    render(<Badge variant="success">Success Badge</Badge>);
    const badge = screen.getByText('Success Badge');
    expect(badge).toHaveClass('text-green-500');
  });

  it('renders correctly with danger variant', () => {
    render(<Badge variant="danger">Danger Badge</Badge>);
    const badge = screen.getByText('Danger Badge');
    expect(badge).toHaveClass('text-red-500');
  });
});
