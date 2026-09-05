'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/src/components/layout/PageHeader';
import { LoadingSpinner } from '@/src/components/layout/LoadingSpinner';
import { useEmployee, useUpdateEmployee } from '@/src/lib/api/queries';
import {
  EmployeeForm,
  type EmployeeFormValues,
} from '../../_components/EmployeeForm';
import type { UpdateEmployeeDTO } from '@peoplepay360/shared';
import type { Employee } from '@/src/lib/api/queries';

function toFormValues(employee: Employee): Partial<EmployeeFormValues> {
  return {
    first_name: employee.first_name,
    last_name: employee.last_name,
    email: employee.email,
    department_id: employee.department_id,
    job_position: employee.job_position,
    working_schedule_id: employee.working_schedule_id,
    manager_id: employee.manager_id ?? '',
    bank_account_no: employee.bank_account_no ?? '',
    bank_name: employee.bank_name ?? '',
    status: employee.status,
  };
}

export default function EditEmployeePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data: employee, isLoading, isError, error } = useEmployee(id);
  const updateEmployee = useUpdateEmployee();
  const [serverError, setServerError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (employee) setReady(true);
  }, [employee]);

  function handleSubmit(values: EmployeeFormValues) {
    setServerError(null);
    const payload: UpdateEmployeeDTO = {
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      email: values.email.trim(),
      department_id: values.department_id,
      job_position: values.job_position.trim(),
      working_schedule_id: values.working_schedule_id,
      manager_id: values.manager_id || undefined,
      bank_account_no: values.bank_account_no || undefined,
      bank_name: values.bank_name || undefined,
      status: values.status,
    };

    updateEmployee.mutate(
      { id, data: payload },
      {
        onSuccess: () => router.push('/employees'),
        onError: (err) => setServerError((err as Error).message || 'Failed to update employee'),
      }
    );
  }

  if (isLoading || !ready) {
    return (
      <div className="flex min-h-60 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <LoadingSpinner label="Loading employee..." />
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
        Error loading employee: {(error as Error).message}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Edit Employee"
        description={`Update the record for ${employee.first_name} ${employee.last_name}`}
        actions={
          <nav className="text-sm text-slate-500">
            <span className="transition-colors hover:text-slate-900">Employees</span>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-700">Edit</span>
          </nav>
        }
      />

      <EmployeeForm
        key={employee.id}
        initialValues={toFormValues(employee)}
        onCancelHref="/employees"
        submitLabel="Save Changes"
        onSubmit={handleSubmit}
        isSubmitting={updateEmployee.isPending}
        serverError={serverError}
        showStatus
      />
    </div>
  );
}