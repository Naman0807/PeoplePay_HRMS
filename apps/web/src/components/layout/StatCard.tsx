interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  trend?: number;
}

export function StatCard({ label, value, icon, trend }: StatCardProps) {
  const trendPositive = (trend ?? 0) >= 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        {icon ? <span className="text-slate-400">{icon}</span> : null}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {trend !== undefined ? (
        <div
          className={`mt-1 text-xs font-medium ${
            trendPositive ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {trendPositive ? '▲' : '▼'} {Math.abs(trend)}%
        </div>
      ) : null}
    </div>
  );
}