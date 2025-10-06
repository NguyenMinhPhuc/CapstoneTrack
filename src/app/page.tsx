
'use client';
import { Suspense } from 'react';
import { DashboardStats } from '@/components/dashboard-stats';
import { DashboardProgressChart } from '@/components/dashboard-progress-chart';
import { DashboardApplicationsTable } from '@/components/dashboard-applications-table';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>
    );
  }

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
