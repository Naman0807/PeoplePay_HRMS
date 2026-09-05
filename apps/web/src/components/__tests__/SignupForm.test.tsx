import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn();

vi.mock('@/src/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

import SignupPage from '@/src/app/(auth)/signup/page';

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('First name'), 'Nora');
  await user.type(screen.getByLabelText('Last name'), 'Ali');
  await user.type(screen.getByLabelText('Email'), 'nora@peoplepay360.com');
  await user.type(screen.getByLabelText('Password'), 'newuser123');
  await user.type(screen.getByLabelText('Confirm password'), 'newuser123');
}

const submit = () => screen.getByRole('button', { name: /create account/i });

describe('signup form', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it('offers every self-serve role but never ADMIN', () => {
    render(<SignupPage />);

    for (const role of ['Employee', 'HR Manager', 'HR Payroll User', 'HR Payroll Manager']) {
      expect(screen.getByRole('option', { name: role })).toBeInTheDocument();
    }
    expect(screen.queryByRole('option', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('registers the account and tells the user to wait for admin approval', async () => {
    apiFetch.mockResolvedValueOnce({ id: 'u1', approval_status: 'PENDING' });
    const user = userEvent.setup();
    render(<SignupPage />);

    await fillValidForm(user);
    await user.selectOptions(screen.getByLabelText('Role'), 'HR_MANAGER');
    await user.click(submit());

    expect(apiFetch).toHaveBeenCalledWith('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        firstName: 'Nora',
        lastName: 'Ali',
        email: 'nora@peoplepay360.com',
        password: 'newuser123',
        role: 'HR_MANAGER',
      }),
    });
    expect(await screen.findByText(/sent to the admin for approval/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
  });

  it('rejects a password under 8 characters without calling the API', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText('First name'), 'Nora');
    await user.type(screen.getByLabelText('Last name'), 'Ali');
    await user.type(screen.getByLabelText('Email'), 'nora@peoplepay360.com');
    await user.type(screen.getByLabelText('Password'), 'abc1');
    await user.type(screen.getByLabelText('Confirm password'), 'abc1');
    await user.click(submit());

    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('requires a letter and a digit in the password', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText('First name'), 'Nora');
    await user.type(screen.getByLabelText('Last name'), 'Ali');
    await user.type(screen.getByLabelText('Email'), 'nora@peoplepay360.com');
    await user.type(screen.getByLabelText('Password'), 'abcdefgh');
    await user.type(screen.getByLabelText('Confirm password'), 'abcdefgh');
    await user.click(submit());

    expect(
      screen.getByText('Password must contain at least one letter and one number')
    ).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('rejects a mismatched confirmation', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText('First name'), 'Nora');
    await user.type(screen.getByLabelText('Last name'), 'Ali');
    await user.type(screen.getByLabelText('Email'), 'nora@peoplepay360.com');
    await user.type(screen.getByLabelText('Password'), 'newuser123');
    await user.type(screen.getByLabelText('Confirm password'), 'newuser124');
    await user.click(submit());

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('rejects a short first name', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText('First name'), 'N');
    await user.type(screen.getByLabelText('Last name'), 'Ali');
    await user.type(screen.getByLabelText('Email'), 'nora@peoplepay360.com');
    await user.type(screen.getByLabelText('Password'), 'newuser123');
    await user.type(screen.getByLabelText('Confirm password'), 'newuser123');
    await user.click(submit());

    expect(screen.getByText('First name must be at least 2 characters')).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('shows the server error when the email is already registered', async () => {
    apiFetch.mockRejectedValueOnce(new Error('Email already registered'));
    const user = userEvent.setup();
    render(<SignupPage />);

    await fillValidForm(user);
    await user.click(submit());

    expect(await screen.findByText('Email already registered')).toBeInTheDocument();
    expect(screen.queryByText(/sent to the admin for approval/i)).not.toBeInTheDocument();
    expect(submit()).toBeEnabled();
  });

  it('reveals both password fields together', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'text');
  });
});
