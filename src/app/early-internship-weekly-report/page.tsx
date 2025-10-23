
'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { EarlyInternshipWeeklyReportDashboard } from '@/components/early-internship-weekly-report-dashboard';


export default function EarlyInternshipWeeklyReportPage() {
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
      <h1 className="text-2xl font-bold">Báo cáo Thực tập sớm Hàng tuần</h1>
      <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
        <EarlyInternshipWeeklyReportDashboard user={user} />
      </Suspense>
    </div>
  );
}
