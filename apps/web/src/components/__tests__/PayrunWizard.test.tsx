import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { usePayrunWizardStore } from '@/src/store/payrunWizardStore';

const store = () => usePayrunWizardStore.getState();

describe('payrun wizard store', () => {
  beforeEach(() => {
    act(() => store().reset());
  });

  it('starts on step 1 with nothing selected', () => {
    expect(store().step).toBe(1);
    expect(store().payrunId).toBeNull();
    expect(store().selectedEmployees).toEqual([]);
  });

  it('walks forward through the four wizard steps', () => {
    act(() => store().setPeriod('2025-01-01', '2025-01-31'));
    act(() => store().setPayrunId('payrun-1'));
    act(() => store().setStep(2));
    expect(store().step).toBe(2);

    act(() => store().setStep(3));
    expect(store().step).toBe(3);

    act(() => store().setStep(4));
    expect(store().step).toBe(4);
    expect(store().payrunId).toBe('payrun-1');
    expect(store().periodStart).toBe('2025-01-01');
    expect(store().periodEnd).toBe('2025-01-31');
  });

  it('walks back to an earlier step without losing the selection', () => {
    act(() => store().setAllEmployees(['e1', 'e2']));
    act(() => store().setStep(3));
    act(() => store().setStep(2));

    expect(store().step).toBe(2);
    expect(store().selectedEmployees).toEqual(['e1', 'e2']);
  });

  it('toggles an employee on and back off', () => {
    act(() => store().toggleEmployee('e1'));
    expect(store().selectedEmployees).toEqual(['e1']);

    act(() => store().toggleEmployee('e2'));
    expect(store().selectedEmployees).toEqual(['e1', 'e2']);

    act(() => store().toggleEmployee('e1'));
    expect(store().selectedEmployees).toEqual(['e2']);
  });

  it('replaces the whole selection with setAllEmployees', () => {
    act(() => store().toggleEmployee('e1'));
    act(() => store().setAllEmployees(['e7', 'e8', 'e9']));

    expect(store().selectedEmployees).toEqual(['e7', 'e8', 'e9']);
  });

  it('clears the selection when setAllEmployees is given an empty list', () => {
    act(() => store().setAllEmployees(['e1', 'e2']));
    act(() => store().setAllEmployees([]));

    expect(store().selectedEmployees).toEqual([]);
  });

  it('resets everything back to step 1 after a payrun is finished', () => {
    act(() => store().setPayrunId('payrun-1'));
    act(() => store().setAllEmployees(['e1']));
    act(() => store().setPeriod('2025-01-01', '2025-01-31'));
    act(() => store().setNotes('January run'));
    act(() => store().setStep(4));

    act(() => store().reset());

    expect(store()).toMatchObject({
      step: 1,
      payrunId: null,
      selectedEmployees: [],
      periodStart: '',
      periodEnd: '',
      notes: '',
    });
  });
});
