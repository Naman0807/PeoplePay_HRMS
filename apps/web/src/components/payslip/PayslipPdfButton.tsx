'use client';

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { apiFetch } from '@/src/lib/api/client';
import PayslipPdf, { type PdfPayslip } from './PayslipPdf';

interface PayslipPdfButtonProps {
  payslipId: string;
  className?: string;
}

export default function PayslipPdfButton({ payslipId, className }: PayslipPdfButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const payslip = await apiFetch<PdfPayslip>(`/payslips/${payslipId}`);
      const blob = await pdf(<PayslipPdf payslip={payslip} />).toBlob();
      const url = URL.createObjectURL(blob);

      const periodStart = payslip.payrun?.period_start?.slice(0, 10) ?? payslip.id;
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip-${periodStart}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className={
          className ??
          'rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60'
        }
      >
        {loading ? 'Generating...' : 'Download PDF'}
      </button>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
