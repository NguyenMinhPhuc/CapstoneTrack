
'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { InternshipGuidanceTable } from '@/components/internship-guidance-table';
import type { Supervisor } from '@/lib/types';


export default function InternshipGuidancePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);
  
  const supervisorDocRef = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'supervisors', user.uid);
  }, [user, firestore]);
  const { data: supervisorData, isLoading: isLoadingSupervisorData } = useDoc<Supervisor>(supervisorDocRef);


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!isUserDataLoading && userData && userData.role !== 'supervisor' && userData.role !== 'admin') {
      router.push('/');
    }
     if (!isLoadingSupervisorData && userData?.role === 'supervisor' && !supervisorData?.canGuideInternship) {
      router.push('/');
    }
  }, [userData, isUserDataLoading, supervisorData, isLoadingSupervisorData, router]);

  const isLoading = isUserLoading || isUserDataLoading || isLoadingSupervisorData;

  if (isLoading || !user || !userData || (userData.role === 'supervisor' && !supervisorData?.canGuideInternship)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <h1 className="text-2xl font-bold">Quản lý Hướng dẫn Thực tập</h1>
      <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
        <InternshipGuidanceTable supervisorId={user.uid} userRole={userData.role} />
      </Suspense>
    </div>
  );
}
