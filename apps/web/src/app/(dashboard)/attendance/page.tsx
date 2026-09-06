'use client';

import { useState } from 'react';
import {
  useAttendance,
  useEmployees,
  useMyAttendance,
  usePunchIn,
  usePunchOut,
  useUpdateAttendance,
} from '@/src/lib/api/queries';
import { Modal } from '@/src/components/layout/Modal';
import { PageHeader } from '@/src/components/layout/PageHeader';
import { useAuthStore } from '@/src/store/authStore';
import { can } from '@peoplepay360/shared';
import { Pagination } from '@/src/components/layout/Pagination';
import { DataTable, type Column } from '@/src/components/layout/DataTable';
import { StatusBadge } from '@/src/components/layout/StatusBadge';
import { EmptyState } from '@/src/components/layout/EmptyState';
import type { AttendanceRecord, Employee } from '@/src/lib/api/queries';
import type { PaginatedResponse } from '@peoplepay360/shared';

function toItems<T>(data: PaginatedResponse<T> | T[] | undefined): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [punchMessage, setPunchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const from = selectedDate;
  const to = selectedDate;

  const [page, setPage] = useState(1);
  const user = useAuthStore((s) => s.user);
  const canViewAll = !!user && can(user.role, 'VIEW_ALL_ATTENDANCE');

  // Employees have no access to /attendance; they read their own log from /attendance/me.
  const allQuery = useAttendance({ from, to, page, pageSize: 20, enabled: canViewAll });
  const ownQuery = useMyAttendance({ from, to, page, pageSize: 20, enabled: !canViewAll });
  const { data: attendanceData, isLoading } = canViewAll ? allQuery : ownQuery;
  const { data: myTodayData } = useMyAttendance({ from: todayISO(), to: todayISO() });
  const { data: employeesData } = useEmployees({ pageSize: 100, enabled: canViewAll });
  const canCorrect = !!user && can(user.role, 'MANUAL_ATTENDANCE_CORRECTION');
  const updateAttendance = useUpdateAttendance();
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');

  const punchIn = usePunchIn();
  const punchOut = usePunchOut();

  const records = toItems<AttendanceRecord>(attendanceData);
  const employees = toItems<Employee>(employeesData);

  const employeeMap = new Map(
    employees.map((e) => [e.id, `${e.first_name} ${e.last_name}`])
  );

  // Current user's record for the "Today" summary card.
  const myTodayRecords = toItems<AttendanceRecord>(myTodayData);
  const todayRecord = selectedDate === todayISO() ? myTodayRecords[0] ?? null : null;
  const isToday = selectedDate === todayISO();

  function handlePunchIn() {
    setPunchMessage(null);
    punchIn.mutate(undefined, {
      onSuccess: (record) => {
        setPunchMessage({
          type: 'success',
          text: `Punched in at ${formatTime(record.check_in)}`,
        });
      },
      onError: (err) => {
        setPunchMessage({
          type: 'error',
          text: (err as Error)?.message || 'Punch in failed',
        });
      },
    });
  }

  function handlePunchOut() {
    setPunchMessage(null);
    punchOut.mutate(undefined, {
      onSuccess: (record) => {
        setPunchMessage({
          type: 'success',
          text: `Punched out at ${formatTime(record.check_out)}`,
        });
      },
      onError: (err) => {
        setPunchMessage({
          type: 'error',
          text: (err as Error)?.message || 'Punch out failed',
        });
      },
    });
  }

  /** <input type="datetime-local"> wants local "YYYY-MM-DDTHH:MM". */
  function toLocalInput(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function openCorrection(record: AttendanceRecord) {
    setEditing(record);
    setEditCheckIn(toLocalInput(record.check_in));
    setEditCheckOut(toLocalInput(record.check_out));
  }

  function handleCorrection() {
    if (!editing) return;
    const data: { check_in?: string; check_out?: string } = {};
    if (editCheckIn) data.check_in = new Date(editCheckIn).toISOString();
    if (editCheckOut) data.check_out = new Date(editCheckOut).toISOString();
    if (!data.check_in && !data.check_out) return;

    updateAttendance.mutate(
      { id: editing.id, data },
      { onSuccess: () => setEditing(null) }
    );
  }

  const columns: Column<AttendanceRecord>[] = [
    ...(canViewAll
      ? [
          {
            key: 'employee',
            header: 'Employee',
            render: (row: AttendanceRecord) =>
              row.employee
                ? `${row.employee.first_name} ${row.employee.last_name}`
                : employeeMap.get(row.employee_id) ?? '—',
          },
        ]
      : []),
    {
      key: 'date',
      header: 'Date',
      // Date-only column: format in UTC so the day never shifts.
      render: (row) => new Date(row.date).toLocaleDateString(undefined, { timeZone: 'UTC' }),
    },
    {
      key: 'check_in',
      header: 'Punch In',
      render: (row) => (
        <span className="font-medium text-slate-900">{formatTime(row.check_in)}</span>
      ),
    },
    {
      key: 'check_out',
      header: 'Punch Out',
      render: (row) => (
        <span className="font-medium text-slate-900">{formatTime(row.check_out)}</span>
      ),
    },
    {
      key: 'worked_hours',
      header: 'Worked Hours',
      render: (row) =>
        row.worked_hours != null ? (
          <span>{row.worked_hours.toFixed(2)}h</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    ...(canCorrect
      ? [
          {
            key: 'actions',
            header: '',
            render: (row: AttendanceRecord) => (
              <button
                type="button"
                onClick={() => openCorrection(row)}
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Edit
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Track daily attendance and punch records"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePunchIn}
              disabled={punchIn.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              {punchIn.isPending ? 'Punching...' : 'Punch In'}
            </button>
            <button
              type="button"
              onClick={handlePunchOut}
              disabled={punchOut.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {punchOut.isPending ? 'Punching...' : 'Punch Out'}
            </button>
          </div>
        }
      />

      <div className="mb-4">
        <label htmlFor="attendance-date" className="mr-2 text-sm font-medium text-slate-700">
          Date
        </label>
        <input
          id="attendance-date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {punchMessage && (
        <div
          className={`mb-4 rounded-md px-4 py-3 text-sm ${
            punchMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-600'
          }`}
        >
          {punchMessage.text}
        </div>
      )}

      {isToday && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-sm font-medium text-slate-500">Today's Status</span>
            <div className="mt-2">
              {todayRecord ? (
                <StatusBadge status={todayRecord.status} />
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  NOT_PUNCHED_IN
                </span>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-sm font-medium text-slate-500">Check In</span>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {formatTime(todayRecord?.check_in ?? null)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-sm font-medium text-slate-500">Check Out</span>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {formatTime(todayRecord?.check_out ?? null)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-sm font-medium text-slate-500">Worked Hours</span>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {todayRecord?.worked_hours != null ? `${todayRecord.worked_hours.toFixed(2)}h` : '—'}
            </div>
          </div>
        </div>
      )}

      {records.length === 0 && !isLoading ? (
        <EmptyState
          icon={
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          message="No attendance records for this date"
        />
      ) : (
        <DataTable
          columns={columns}
          data={records}
          keyExtractor={(row) => row.id}
          loading={isLoading}
          emptyMessage="No attendance records"
        />
      )}

      <Pagination
        page={page}
        totalPages={attendanceData?.meta?.totalPages ?? 1}
        total={attendanceData?.meta?.total}
        label="records"
        onChange={setPage}
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Correct Attendance"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCorrection}
              disabled={updateAttendance.isPending || (!editCheckIn && !editCheckOut)}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {updateAttendance.isPending ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="edit-check-in"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Punch In
            </label>
            <input
              id="edit-check-in"
              type="datetime-local"
              value={editCheckIn}
              onChange={(e) => setEditCheckIn(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="edit-check-out"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Punch Out
            </label>
            <input
              id="edit-check-out"
              type="datetime-local"
              value={editCheckOut}
              onChange={(e) => setEditCheckOut(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          {updateAttendance.isError && (
            <p className="text-sm text-rose-600">
              {(updateAttendance.error as Error)?.message ?? 'Failed to save correction'}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
