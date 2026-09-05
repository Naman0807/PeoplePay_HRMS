'use client';

import { create } from 'zustand';

export type PayrunWizardStep = 1 | 2 | 3 | 4;

interface PayrunWizardState {
  step: PayrunWizardStep;
  payrunId: string | null;
  selectedEmployees: string[];
  periodStart: string;
  periodEnd: string;
  notes: string;
  setStep: (step: PayrunWizardStep) => void;
  setPayrunId: (payrunId: string) => void;
  toggleEmployee: (employeeId: string) => void;
  setAllEmployees: (employeeIds: string[]) => void;
  setPeriod: (start: string, end: string) => void;
  setNotes: (notes: string) => void;
  reset: () => void;
}

export const usePayrunWizardStore = create<PayrunWizardState>((set) => ({
  step: 1,
  payrunId: null,
  selectedEmployees: [],
  periodStart: '',
  periodEnd: '',
  notes: '',

  setStep: (step) => set({ step }),

  setPayrunId: (payrunId) => set({ payrunId }),

  toggleEmployee: (employeeId) =>
    set((state) => ({
      selectedEmployees: state.selectedEmployees.includes(employeeId)
        ? state.selectedEmployees.filter((id) => id !== employeeId)
        : [...state.selectedEmployees, employeeId],
    })),

  setAllEmployees: (employeeIds) => set({ selectedEmployees: employeeIds }),

  setPeriod: (periodStart, periodEnd) => set({ periodStart, periodEnd }),

  setNotes: (notes) => set({ notes }),

  reset: () =>
    set({
      step: 1,
      payrunId: null,
      selectedEmployees: [],
      periodStart: '',
      periodEnd: '',
      notes: '',
    }),
}));