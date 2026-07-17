import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AvatarEmoji } from './avatar-emoji';
import { RoleBadge } from './role-badge';

describe('UI Shared Components', () => {
  describe('AvatarEmoji', () => {
    it('renders given emoji', () => {
      render(<AvatarEmoji emoji="🚀" />);
      expect(screen.getByText('🚀')).toBeInTheDocument();
    });

    it('renders fallback emoji when none provided', () => {
      render(<AvatarEmoji />);
      expect(screen.getByText('😀')).toBeInTheDocument();
    });
  });

  describe('RoleBadge', () => {
    it('renders correct configured role label', () => {
      render(<RoleBadge role="admin" />);
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
    });

    it('renders fallback user badge when unknown role is provided', () => {
      render(<RoleBadge role={'unknown-role' as any} />);
      expect(screen.getByText('USER')).toBeInTheDocument();
    });
  });
});
