import { LoadingSpinner } from '@/src/components/layout/LoadingSpinner';

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingSpinner label="Loading..." />
    </div>
  );
}
