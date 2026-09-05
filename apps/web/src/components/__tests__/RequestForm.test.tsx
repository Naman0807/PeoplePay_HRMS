import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createRequest = { mutate: vi.fn(), isPending: false, isError: false };
const submitRequest = { mutate: vi.fn(), isPending: false };
const approveRequest = { mutate: vi.fn(), isPending: false };
const refuseRequest = { mutate: vi.fn(), isPending: false };

const types = [
  { id: 'type-1', name: 'Paid Time Off', unit: 'DAYS', requires_allocation: true },
  { id: 'type-2', name: 'Unpaid Leave', unit: 'DAYS', requires_allocation: false },
];

const allocations = [
  {
    id: 'alloc-1',
    employee_id: 'emp-1',
    time_off_type_id: 'type-1',
    allocated_units: 20,
    taken_units: 5,
    remaining_units: 15,
    status: 'APPROVED',
    time_off_type: { id: 'type-1', name: 'Paid Time Off' },
  },
];

const requests = [
  {
    id: 'req-1',
    employee_id: 'emp-1',
    time_off_type_id: 'type-1',
    start_date: '2025-03-10',
    end_date: '2025-03-14',
    duration: 5,
    status: 'SUBMITTED',
    employee: { first_name: 'Ada', last_name: 'Lovelace' },
    time_off_type: { id: 'type-1', name: 'Paid Time Off' },
  },
];

const employees = [{ id: 'emp-1', first_name: 'Ada', last_name: 'Lovelace' }];

vi.mock('@/src/lib/api/queries', () => ({
  useTimeOffTypes: () => ({ data: types, isLoading: false, isError: false }),
  useTimeOffAllocations: () => ({ data: allocations, isLoading: false, isError: false }),
  useTimeOffRequests: () => ({ data: requests, isLoading: false, isError: false }),
  useEmployees: () => ({ data: employees, isLoading: false, isError: false }),
  useCreateTimeOffRequest: () => createRequest,
  useSubmitTimeOffRequest: () => submitRequest,
  useApproveTimeOffRequest: () => approveRequest,
  useRefuseTimeOffRequest: () => refuseRequest,
}));

import TimeOffPage from '@/src/app/(dashboard)/time-off/page';

async function openRequestForm() {
  const user = userEvent.setup();
  render(<TimeOffPage />);
  await user.click(screen.getByRole('button', { name: /new request/i }));
  return user;
}

function submitButton() {
  return within(screen.getByRole('dialog')).getByRole('button', { name: /submit request/i });
}

describe('time off request form', () => {
  beforeEach(() => {
    createRequest.mutate.mockClear();
  });

  it('shows the remaining balance per time off type', () => {
    render(<TimeOffPage />);

    const card = screen.getByText('Paid Time Off available').closest<HTMLElement>('div.rounded-xl')!;
    expect(within(card).getByText('15')).toBeInTheDocument();
  });

  it('counts the submitted requests as pending', () => {
    render(<TimeOffPage />);

    const pending = screen.getByText('Pending requests').closest<HTMLElement>('div.rounded-xl')!;
    expect(within(pending).getByText('1')).toBeInTheDocument();
  });

  it('keeps the submit button disabled until every field is filled', async () => {
    const user = await openRequestForm();

    expect(submitButton()).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('Employee'), 'emp-1');
    expect(submitButton()).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('Time off type'), 'type-1');
    await user.type(screen.getByLabelText('Start date'), '2025-03-10');
    expect(submitButton()).toBeDisabled();

    await user.type(screen.getByLabelText('End date'), '2025-03-14');
    expect(submitButton()).toBeEnabled();
  });

  it('submits the request with the selected values', async () => {
    const user = await openRequestForm();

    await user.selectOptions(screen.getByLabelText('Employee'), 'emp-1');
    await user.selectOptions(screen.getByLabelText('Time off type'), 'type-1');
    await user.type(screen.getByLabelText('Start date'), '2025-03-10');
    await user.type(screen.getByLabelText('End date'), '2025-03-14');
    await user.click(submitButton());

    expect(createRequest.mutate).toHaveBeenCalledTimes(1);
    expect(createRequest.mutate.mock.calls[0][0]).toEqual({
      employee_id: 'emp-1',
      time_off_type_id: 'type-1',
      start_date: '2025-03-10',
      end_date: '2025-03-14',
    });
  });

  it('lists the employees and types the API returned', async () => {
    await openRequestForm();

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('option', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: 'Paid Time Off' })).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: 'Unpaid Leave' })).toBeInTheDocument();
  });

  it('closes the form without submitting when cancelled', async () => {
    const user = await openRequestForm();

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(createRequest.mutate).not.toHaveBeenCalled();
  });
});
