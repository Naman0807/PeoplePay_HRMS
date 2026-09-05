'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/src/components/layout/PageHeader';
import { useCreateEmployee } from '@/src/lib/api/queries';
import {
  EmployeeForm,
  type EmployeeFormValues,
} from '../_components/EmployeeForm';
import type { CreateEmployeeDTO } from '@peoplepay360/shared';

export default function NewEmployeePage() {
  const router = useRouter();
  const createEmployee = useCreateEmployee();
  const [serverError, setServerError] = useState<string | null>(null);

  function handleSubmit(values: EmployeeFormValues) {
    setServerError(null);
    const payload: CreateEmployeeDTO & { temporary_password?: string } = {
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      email: values.email.trim(),
      department_id: values.department_id,
      job_position: values.job_position.trim(),
      working_schedule_id: values.working_schedule_id,
      manager_id: values.manager_id || undefined,
      bank_account_no: values.bank_account_no || undefined,
      bank_name: values.bank_name || undefined,
      temporary_password: values.temporary_password || undefined,
    };

    createEmployee.mutate(payload, {
      onSuccess: () => router.push('/employees'),
      onError: (err) => setServerError((err as Error).message || 'Failed to create employee'),
    });
  }

  return (
    <div>
      <PageHeader
        title="Add Employee"
        description="Create a new employee record"
        actions={
          <nav className="text-sm text-slate-500">
            <span className="transition-colors hover:text-slate-900">Employees</span>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-700">New</span>
          </nav>
        }
      />

      <EmployeeForm
        onCancelHref="/employees"
        submitLabel="Create Employee"
        onSubmit={handleSubmit}
        isSubmitting={createEmployee.isPending}
        serverError={serverError}
      />
    </div>
  );
}