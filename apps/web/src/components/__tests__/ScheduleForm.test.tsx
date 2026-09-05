import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createSchedule = { mutate: vi.fn(), isPending: false, isError: false, error: null };

vi.mock('@/src/lib/api/queries', () => ({
  useSchedules: () => ({ data: [], isLoading: false }),
  useCreateSchedule: () => createSchedule,
}));

import SchedulesPage from '@/src/app/(dashboard)/schedules/page';
import { useAuthStore } from '@/src/store/authStore';

async function openForm() {
  const user = userEvent.setup();
  render(<SchedulesPage />);
  await user.click(screen.getAllByRole('button', { name: /create schedule/i })[0]);
  return user;
}

/** The form shows a live weekly-hours total, mirroring the server calculation. */
function weeklyHours() {
  return Number(screen.getByTestId('weekly-hours').textContent);
}

describe('schedule form', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'hr@peoplepay360.com', role: 'HR_MANAGER' },
      accessToken: 'token',
      isAuthenticated: true,
      hasHydrated: true,
    });
  });

  it('starts at zero hours with no working day selected', async () => {
    await openForm();

    expect(weeklyHours()).toBe(0);
  });

  it('adds 7 hours for a 09:00-17:00 day with a 60 minute break', async () => {
    const user = await openForm();

    await user.click(screen.getByLabelText('Toggle Monday'));

    expect(weeklyHours()).toBe(7);
  });

  it('recalculates live across a five day week', async () => {
    const user = await openForm();

    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      await user.click(screen.getByLabelText(`Toggle ${day}`));
    }

    expect(weeklyHours()).toBe(35);
  });

  it('recalculates when the break is edited', async () => {
    const user = await openForm();
    await user.click(screen.getByLabelText('Toggle Monday'));

    const breakInput = screen.getByDisplayValue('60');
    await user.clear(breakInput);
    await user.type(breakInput, '0');

    expect(weeklyHours()).toBe(8);
  });

  it('drops the hours again when a day is unselected', async () => {
    const user = await openForm();
    await user.click(screen.getByLabelText('Toggle Monday'));
    expect(weeklyHours()).toBe(7);

    await user.click(screen.getByLabelText('Toggle Monday'));

    expect(weeklyHours()).toBe(0);
  });

  it('submits the selected days as schedule lines', async () => {
    const user = await openForm();

    await user.type(screen.getByLabelText('Name'), 'Standard 9-5');
    await user.click(screen.getByLabelText('Toggle Monday'));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Create Schedule' }));

    expect(createSchedule.mutate).toHaveBeenCalledTimes(1);
    expect(createSchedule.mutate.mock.calls[0][0]).toEqual({
      name: 'Standard 9-5',
      schedule_type: 'STANDARD',
      schedule_lines: [
        {
          day_of_week: 'MONDAY',
          start_time: '09:00',
          end_time: '17:00',
          break_duration_mins: 60,
        },
      ],
    });
  });

  it('does not submit a schedule with no working day', async () => {
    const user = await openForm();

    await user.type(screen.getByLabelText('Name'), 'Empty schedule');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Create Schedule' }));

    expect(createSchedule.mutate).not.toHaveBeenCalled();
  });

  it('renders every day of the week in the form', async () => {
    await openForm();
    const dialog = screen.getByRole('dialog');

    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
      expect(within(dialog).getByText(day)).toBeInTheDocument();
    }
  });
});
