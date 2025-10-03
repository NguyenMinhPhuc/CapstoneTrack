import { Suspense } from 'react';
import { DashboardStats } from '@/components/dashboard-stats';
import { DashboardProgressChart } from '@/components/dashboard-progress-chart';
import { DashboardApplicationsTable } from '@/components/dashboard-applications-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <Suspense fallback={<DashboardStats.Skeleton />}>
        <DashboardStats />
      </Suspense>
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8 space-y-8 lg:space-y-0">
        <div className="lg:col-span-2">
          <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
            <DashboardApplicationsTable />
          </Suspense>
        </div>
        <div className="lg:col-span-1">
          <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
            <DashboardProgressChart />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
