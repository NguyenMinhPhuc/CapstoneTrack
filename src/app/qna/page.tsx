'use client';

import { QnaDashboard } from '@/components/qna-dashboard';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function QnaPage() {
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
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
          <Skeleton className="h-[60vh] w-full" />
          <Skeleton className="h-[60vh] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-2 lg:p-4 h-[calc(100vh-4rem)]">
      <QnaDashboard currentUser={user} />
    </div>
  );
}
