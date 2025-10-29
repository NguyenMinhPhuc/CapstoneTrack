
'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { GraduationGuidanceTable } from '@/components/graduation-guidance-table';

export default function GraduationGuidancePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!isUserDataLoading && userData && userData.role !== 'supervisor' && userData.role !== 'admin') {
      router.push('/');
    }
  }, [userData, isUserDataLoading, router]);

  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading || !user || !userData || (userData.role !== 'supervisor' && userData.role !== 'admin')) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <h1 className="text-2xl font-bold">Quản lý Hướng dẫn Tốt nghiệp</h1>
      <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
        <GraduationGuidanceTable supervisorId={user.uid} userRole={userData.role} />
      </Suspense>
    </div>
  );
}
