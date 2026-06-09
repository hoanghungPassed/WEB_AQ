import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, LoadingOverlay } from './Loading';

describe('Loading Components', () => {
  describe('LoadingSpinner', () => {
    it('renders with label', () => {
      render(<LoadingSpinner label="Testing Label" />);
      expect(screen.getByText('Testing Label')).toBeInTheDocument();
    });

    it('renders without label', () => {
      const { container } = render(<LoadingSpinner />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
      expect(screen.queryByText('Testing Label')).not.toBeInTheDocument();
    });
  });

  describe('LoadingOverlay', () => {
    it('renders with default label', () => {
      render(<LoadingOverlay />);
      expect(screen.getByText('Đang tải dữ liệu...')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(<LoadingOverlay label="Custom Loading" />);
      expect(screen.getByText('Custom Loading')).toBeInTheDocument();
    });
  });
});
