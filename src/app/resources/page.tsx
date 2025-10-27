
'use client';

import { ResourceList } from '@/components/resource-list';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';

export default function ResourcesPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <h1 className="text-2xl font-bold">Tài nguyên & Biểu mẫu</h1>
      <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
        <ResourceList />
      </Suspense>
    </div>
  );
}
