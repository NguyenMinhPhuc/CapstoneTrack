'use client';

import { Suspense } from 'react';
import { DefenseSessionsTable } from '@/components/defense-sessions-table';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { doc } from 'firebase/firestore';

export default function DefenseSessionsPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  useEffect(() => {
    // If not loading and no user is logged in, redirect to login page.
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    // After user data has loaded, check the role.
    // If the user is not an admin, redirect them to the home page.
    if (!isUserDataLoading && userData && userData.role !== 'admin') {
      router.push('/');
    }
  }, [userData, isUserDataLoading, router]);

  const isLoading = isUserLoading || isUserDataLoading;

  // Show a loading skeleton until we confirm the user is an admin.
  // If not an admin, they will be redirected by the useEffect above.
  if (isLoading || !userData || userData.role !== 'admin') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>
    );
  }

  // Render the page only if the user is a confirmed admin.
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <h1 className="text-2xl font-bold">Quản lý Đợt báo cáo</h1>
      <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
        <DefenseSessionsTable />
      </Suspense>
    </div>
  );
}
