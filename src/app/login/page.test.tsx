import { vi, describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';
import { loginAction } from '@/app/actions/auth';

vi.mock('@/app/actions/auth', () => ({
  loginAction: vi.fn(),
}));

describe('LoginPage integration test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: /DIVINATION/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Masuk$/i })).toBeInTheDocument();
  });

  it('toggles password visibility when clicking eye button', async () => {
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText(/Password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /Toggle password visibility/i });
    await userEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');

    await userEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('displays error message on failed login', async () => {
    let resolveLogin: (value: { error: string }) => void = () => {};
    vi.mocked(loginAction).mockImplementationOnce(
      () => new Promise((resolve) => { resolveLogin = resolve; })
    );
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /^Masuk$/i });

    await userEvent.type(emailInput, 'wrong@example.com');
    await userEvent.type(passwordInput, 'wrongpassword');
    await userEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Memproses...')).toBeInTheDocument();

    await act(async () => {
      resolveLogin({ error: 'Email atau password salah' });
    });

    await waitFor(() => {
      expect(screen.getByText('Email atau password salah')).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('submits form with correct parameters', async () => {
    vi.mocked(loginAction).mockResolvedValueOnce(undefined as any);
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /^Masuk$/i });

    await userEvent.type(emailInput, 'correct@example.com');
    await userEvent.type(passwordInput, 'correctpassword');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(loginAction).toHaveBeenCalledTimes(1);
    });
  });
});
