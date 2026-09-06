'use client';

import { useMemo, useState } from 'react';
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  listOf,
} from '@/src/lib/api/queries';
import { RequireAuth } from '@/src/components/auth/RequireAuth';
import { PageHeader } from '@/src/components/layout/PageHeader';
import { Pagination } from '@/src/components/layout/Pagination';
import { DataTable, type Column } from '@/src/components/layout/DataTable';
import { Modal } from '@/src/components/layout/Modal';
import { EmptyState } from '@/src/components/layout/EmptyState';
import { ConfirmDialog } from '@/src/components/layout/ConfirmDialog';
import type { WorkingSchedule } from '@/src/lib/api/queries';
import { calculateWeeklyHours } from '@peoplepay360/shared';
import type { DayOfWeek, CreateScheduleDTO, ScheduleLineInput } from '@peoplepay360/shared';

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'MONDAY', label: 'Monday', short: 'Mon' },
  { key: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { key: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { key: 'FRIDAY', label: 'Friday', short: 'Fri' },
  { key: 'SATURDAY', label: 'Saturday', short: 'Sat' },
  { key: 'SUNDAY', label: 'Sunday', short: 'Sun' },
];

interface DayConfig {
  isWorking: boolean;
  startTime: string;
  endTime: string;
  breakMinutes: number;
}

const DEFAULT_DAY: DayConfig = {
  isWorking: false,
  startTime: '09:00',
  endTime: '17:00',
  breakMinutes: 60,
};

/** Prisma @db.Time comes back as an ISO datetime; keep only HH:MM. */
function toHHMM(value: string): string {
  const match = /T(\d{2}:\d{2})/.exec(value);
  if (match) return match[1];
  return value.slice(0, 5);
}

function SchedulesPageContent() {
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { data: schedulesData, isLoading } = useSchedules({ page, pageSize: 20 });
  const schedules = listOf(schedulesData);
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const [viewing, setViewing] = useState<WorkingSchedule | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<WorkingSchedule | null>(null);

  const [name, setName] = useState('');
  const [scheduleType, setScheduleType] = useState('STANDARD');
  const [days, setDays] = useState<Record<DayOfWeek, DayConfig>>({
    MONDAY: { ...DEFAULT_DAY },
    TUESDAY: { ...DEFAULT_DAY },
    WEDNESDAY: { ...DEFAULT_DAY },
    THURSDAY: { ...DEFAULT_DAY },
    FRIDAY: { ...DEFAULT_DAY },
    SATURDAY: { isWorking: false, startTime: '09:00', endTime: '13:00', breakMinutes: 0 },
    SUNDAY: { isWorking: false, startTime: '09:00', endTime: '13:00', breakMinutes: 0 },
  });

  // Mirrors the server-side calculation so the total updates as the form is edited.
  const liveWeeklyHours = useMemo(
    () =>
      calculateWeeklyHours(
        DAYS.filter((d) => days[d.key].isWorking).map((d) => ({
          start_time: days[d.key].startTime,
          end_time: days[d.key].endTime,
          break_duration_mins: days[d.key].breakMinutes,
        }))
      ),
    [days]
  );

  function resetForm() {
    setName('');
    setScheduleType('STANDARD');
    setDays({
      MONDAY: { ...DEFAULT_DAY },
      TUESDAY: { ...DEFAULT_DAY },
      WEDNESDAY: { ...DEFAULT_DAY },
      THURSDAY: { ...DEFAULT_DAY },
      FRIDAY: { ...DEFAULT_DAY },
      SATURDAY: { isWorking: false, startTime: '09:00', endTime: '13:00', breakMinutes: 0 },
      SUNDAY: { isWorking: false, startTime: '09:00', endTime: '13:00', breakMinutes: 0 },
    });
  }

  function openEdit(schedule: WorkingSchedule) {
    const next: Record<DayOfWeek, DayConfig> = {
      MONDAY: { ...DEFAULT_DAY },
      TUESDAY: { ...DEFAULT_DAY },
      WEDNESDAY: { ...DEFAULT_DAY },
      THURSDAY: { ...DEFAULT_DAY },
      FRIDAY: { ...DEFAULT_DAY },
      SATURDAY: { ...DEFAULT_DAY },
      SUNDAY: { ...DEFAULT_DAY },
    };
    for (const line of schedule.schedule_lines ?? []) {
      next[line.day_of_week as DayOfWeek] = {
        isWorking: true,
        startTime: toHHMM(line.start_time),
        endTime: toHHMM(line.end_time),
        breakMinutes: line.break_duration_mins,
      };
    }
    setName(schedule.name);
    setScheduleType(schedule.schedule_type);
    setDays(next);
    setEditingId(schedule.id);
    setModalOpen(true);
  }

  function toggleDay(day: DayOfWeek) {
    setDays((prev) => ({
      ...prev,
      [day]: { ...prev[day], isWorking: !prev[day].isWorking },
    }));
  }

  function updateDay(day: DayOfWeek, field: keyof DayConfig, value: string | number) {
    setDays((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const scheduleLines: ScheduleLineInput[] = DAYS.filter((d) => days[d.key].isWorking).map((d) => ({
      day_of_week: d.key,
      start_time: days[d.key].startTime,
      end_time: days[d.key].endTime,
      break_duration_mins: days[d.key].breakMinutes,
    }));

    if (scheduleLines.length === 0) return;

    const payload: CreateScheduleDTO = {
      name: name.trim(),
      schedule_type: scheduleType,
      schedule_lines: scheduleLines,
    };

    const done = {
      onSuccess: () => {
        setModalOpen(false);
        setEditingId(null);
        resetForm();
      },
    };

    if (editingId) {
      updateSchedule.mutate({ id: editingId, data: payload }, done);
    } else {
      createSchedule.mutate(payload, done);
    }
  }

  function getWorkingDays(schedule: WorkingSchedule) {
    const abbrevs: Record<string, string> = {
      MONDAY: 'Mon',
      TUESDAY: 'Tue',
      WEDNESDAY: 'Wed',
      THURSDAY: 'Thu',
      FRIDAY: 'Fri',
      SATURDAY: 'Sat',
      SUNDAY: 'Sun',
    };
    return (schedule.schedule_lines ?? []).map((line) => abbrevs[line.day_of_week] ?? line.day_of_week);
  }

  const columns: Column<WorkingSchedule>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className="font-medium text-slate-900">{row.name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className="text-xs font-medium text-slate-500">{row.schedule_type}</span>
      ),
    },
    {
      key: 'weekly_hours',
      header: 'Weekly Hours',
      render: (row) => <span>{row.weekly_hours}h</span>,
    },
    {
      key: 'days',
      header: 'Days',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {getWorkingDays(row).map((d) => (
            <span
              key={d}
              className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
            >
              {d}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setViewing(row)}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            View
          </button>
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeleting(row)}
            className="text-sm font-medium text-rose-600 hover:text-rose-700"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Schedules"
        description="Define working schedules for employees"
        actions={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Schedule
          </button>
        }
      />

      {schedules && schedules.length === 0 && !isLoading ? (
        <EmptyState
          icon={
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          message="No schedules found"
          action={
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Create Schedule
            </button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={schedules}
          keyExtractor={(row) => row.id}
          loading={isLoading}
          emptyMessage="No schedules found"
        />
      )}

      <Pagination
        page={page}
        totalPages={schedulesData?.meta?.totalPages ?? 1}
        total={schedulesData?.meta?.total}
        label="schedules"
        onChange={setPage}
      />

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
          resetForm();
        }}
        title={editingId ? 'Edit Schedule' : 'New Schedule'}
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setEditingId(null);
                resetForm();
              }}
              disabled={createSchedule.isPending || updateSchedule.isPending}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="schedule-form"
              disabled={createSchedule.isPending || updateSchedule.isPending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {createSchedule.isPending || updateSchedule.isPending
                ? 'Saving...'
                : editingId
                  ? 'Save Changes'
                  : 'Create Schedule'}
            </button>
          </>
        }
      >
        <form id="schedule-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="schedule-name" className="mb-1 block text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                id="schedule-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                placeholder="e.g. Standard 9-5"
                required
              />
            </div>

            <div>
              <label htmlFor="schedule-type" className="mb-1 block text-sm font-medium text-slate-700">
                Type
              </label>
              <input
                id="schedule-type"
                type="text"
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                placeholder="e.g. STANDARD"
                required
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Working Days</p>
              <p className="text-sm text-slate-500">
                Weekly hours:{' '}
                <span data-testid="weekly-hours" className="font-semibold text-slate-900">
                  {liveWeeklyHours}
                </span>
                h
              </p>
            </div>
            <div className="space-y-3">
              {DAYS.map((day) => (
                <div
                  key={day.key}
                  className={`rounded-lg border p-3 transition-colors ${
                    days[day.key].isWorking
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDay(day.key)}
                      className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
                        days[day.key].isWorking
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-300 bg-white text-transparent hover:border-slate-400'
                      }`}
                      aria-label={`Toggle ${day.label}`}
                    >
                      {days[day.key].isWorking && (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className={`w-24 text-sm font-medium ${days[day.key].isWorking ? 'text-slate-900' : 'text-slate-400'}`}>
                      {day.label}
                    </span>

                    {days[day.key].isWorking && (
                      <div className="ml-auto flex items-center gap-2">
                        <input
                          type="time"
                          value={days[day.key].startTime}
                          onChange={(e) => updateDay(day.key, 'startTime', e.target.value)}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-slate-500"
                        />
                        <span className="text-xs text-slate-400">to</span>
                        <input
                          type="time"
                          value={days[day.key].endTime}
                          onChange={(e) => updateDay(day.key, 'endTime', e.target.value)}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-slate-500"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="480"
                            step="15"
                            value={days[day.key].breakMinutes}
                            onChange={(e) => updateDay(day.key, 'breakMinutes', Number(e.target.value))}
                            className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-slate-500"
                          />
                          <span className="text-xs text-slate-400">min break</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {createSchedule.isError && (
            <p className="text-sm text-rose-600">
              {(createSchedule.error as Error)?.message ?? 'Failed to create schedule'}
            </p>
          )}
        </form>
      </Modal>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="Schedule Details"
        size="md"
      >
        {viewing ? (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <dt className="text-slate-500">Name</dt>
              <dd className="text-slate-900">{viewing.name}</dd>
              <dt className="text-slate-500">Type</dt>
              <dd className="text-slate-900">{viewing.schedule_type}</dd>
              <dt className="text-slate-500">Weekly Hours</dt>
              <dd className="text-slate-900">{viewing.weekly_hours}h</dd>
            </dl>
            <div>
              <p className="mb-2 font-medium text-slate-700">Working Days</p>
              {(viewing.schedule_lines ?? []).length === 0 ? (
                <p className="text-slate-500">No working days configured.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {(viewing.schedule_lines ?? []).map((line) => (
                    <li
                      key={line.day_of_week}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <span className="text-slate-700">{line.day_of_week}</span>
                      <span className="text-slate-500">
                        {toHHMM(line.start_time)} – {toHHMM(line.end_time)} ·{' '}
                        {line.break_duration_mins}m break
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete schedule"
        message={`Delete "${deleting?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleteSchedule.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          deleteSchedule.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </div>
  );
}

export default function SchedulesPage() {
  return (
    <RequireAuth capability="MANAGE_CONTRACTS_SCHEDULES">
      <SchedulesPageContent />
    </RequireAuth>
  );
}
