import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn();

vi.mock('@/src/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

import LoginPage from '@/src/app/(auth)/login/page';
import { routerMock } from '../../../tests/setup';
import { useAuthStore } from '@/src/store/authStore';

const session = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: { id: 'u1', email: 'admin@peoplepay360.com', role: 'ADMIN' as const },
};

describe('login form', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: true,
    });
  });

  it('renders the email and password fields', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('posts the credentials and redirects to the dashboard', async () => {
    apiFetch.mockResolvedValueOnce(session);
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'hr@peoplepay360.com');
    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith('/dashboard'));
    expect(apiFetch).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'hr@peoplepay360.com', password: 'secret123' }),
    });
  });

  it('stores the session so the app knows the user is authenticated', async () => {
    apiFetch.mockResolvedValueOnce(session);
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
    expect(useAuthStore.getState().user?.role).toBe('ADMIN');
    expect(localStorage.getItem('pp360_access_token')).toBe('access-token');
  });

  it('shows the server error and stays on the page when the login fails', async () => {
    apiFetch.mockRejectedValueOnce(new Error('Invalid credentials'));
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('does not submit an empty email (native required validation)', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.clear(screen.getByLabelText('Email'));
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(apiFetch).not.toHaveBeenCalled();
  });
});
