'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useDepartments,
  useSchedules,
  useEmployees,
} from '@/src/lib/api/queries';

export interface EmployeeFormValues {
  first_name: string;
  last_name: string;
  email: string;
  department_id: string;
  job_position: string;
  working_schedule_id: string;
  manager_id: string;
  bank_account_no: string;
  bank_name: string;
  temporary_password: string;
  status: 'ACTIVE' | 'INACTIVE';
}

type FormErrors = Partial<Record<keyof EmployeeFormValues, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass = (hasError: boolean) =>
  `w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
    hasError
      ? 'border-rose-300 focus:border-rose-500'
      : 'border-slate-300 focus:border-slate-500'
  }`;

interface EmployeeFormProps {
  initialValues?: Partial<EmployeeFormValues>;
  onCancelHref: string;
  submitLabel: string;
  onSubmit: (values: EmployeeFormValues) => void;
  isSubmitting: boolean;
  serverError?: string | null;
  showStatus?: boolean;
}

export function EmployeeForm({
  initialValues,
  onCancelHref,
  submitLabel,
  onSubmit,
  isSubmitting,
  serverError,
  showStatus = false,
}: EmployeeFormProps) {
  const [values, setValues] = useState<EmployeeFormValues>({
    first_name: '',
    last_name: '',
    email: '',
    department_id: '',
    job_position: '',
    working_schedule_id: '',
    manager_id: '',
    bank_account_no: '',
    bank_name: '',
    temporary_password: '',
    status: 'ACTIVE',
    ...initialValues,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const { data: departments } = useDepartments();
  const { data: schedules } = useSchedules();
  const { data: managersData } = useEmployees({ page: 1, pageSize: 100 });

  function setField<K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!values.first_name.trim()) next.first_name = 'First name is required';
    if (!values.last_name.trim()) next.last_name = 'Last name is required';
    if (!values.email.trim()) {
      next.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(values.email)) {
      next.email = 'Please enter a valid email address';
    }
    if (!values.department_id) next.department_id = 'Department is required';
    if (!values.job_position.trim()) next.job_position = 'Position is required';
    if (!values.working_schedule_id) next.working_schedule_id = 'Working schedule is required';
    return next;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length === 0) {
      onSubmit(values);
    }
  }

  const managers = Array.isArray(managersData) ? managersData : (managersData?.items ?? []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Employee details</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">First name</label>
            <input
              type="text"
              value={values.first_name}
              onChange={(e) => setField('first_name', e.target.value)}
              className={inputClass(!!errors.first_name)}
            />
            {errors.first_name ? (
              <p className="mt-1 text-xs text-rose-600">{errors.first_name}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Last name</label>
            <input
              type="text"
              value={values.last_name}
              onChange={(e) => setField('last_name', e.target.value)}
              className={inputClass(!!errors.last_name)}
            />
            {errors.last_name ? (
              <p className="mt-1 text-xs text-rose-600">{errors.last_name}</p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={values.email}
              onChange={(e) => setField('email', e.target.value)}
              className={inputClass(!!errors.email)}
            />
            {errors.email ? <p className="mt-1 text-xs text-rose-600">{errors.email}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
            <select
              value={values.department_id}
              onChange={(e) => setField('department_id', e.target.value)}
              className={`${inputClass(!!errors.department_id)} bg-white`}
            >
              <option value="">Select department</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {errors.department_id ? (
              <p className="mt-1 text-xs text-rose-600">{errors.department_id}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Position</label>
            <input
              type="text"
              value={values.job_position}
              onChange={(e) => setField('job_position', e.target.value)}
              placeholder="e.g. Software Engineer"
              className={inputClass(!!errors.job_position)}
            />
            {errors.job_position ? (
              <p className="mt-1 text-xs text-rose-600">{errors.job_position}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Working schedule</label>
            <select
              value={values.working_schedule_id}
              onChange={(e) => setField('working_schedule_id', e.target.value)}
              className={`${inputClass(!!errors.working_schedule_id)} bg-white`}
            >
              <option value="">Select schedule</option>
              {schedules?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.working_schedule_id ? (
              <p className="mt-1 text-xs text-rose-600">{errors.working_schedule_id}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Manager <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <select
              value={values.manager_id}
              onChange={(e) => setField('manager_id', e.target.value)}
              className={`${inputClass(false)} bg-white`}
            >
              <option value="">No manager</option>
              {managers
                .filter((m) => m.first_name || m.last_name)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.last_name}
                  </option>
                ))}
            </select>
          </div>

          {showStatus ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select
                value={values.status}
                onChange={(e) =>
                  setField('status', e.target.value as 'ACTIVE' | 'INACTIVE')
                }
                className={`${inputClass(false)} bg-white`}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Temporary password{' '}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="password"
                value={values.temporary_password}
                onChange={(e) => setField('temporary_password', e.target.value)}
                placeholder="Defaults to Welcome123!"
                className={inputClass(false)}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Bank account number <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={values.bank_account_no}
              onChange={(e) => setField('bank_account_no', e.target.value)}
              className={inputClass(false)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Bank name <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={values.bank_name}
              onChange={(e) => setField('bank_name', e.target.value)}
              className={inputClass(false)}
            />
          </div>
        </div>
      </div>

      {serverError && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{serverError}</div>
      )}

      <div className="flex justify-end gap-2">
        <Link
          href={onCancelHref}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}