
'use client';

import { Suspense } from 'react';
import { SupervisorManagementTable } from '@/components/supervisor-management-table';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppHeader } from '@/components/app-header';

export default function SupervisorManagementPage() {
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
    if (!isUserDataLoading && userData && userData.role !== 'admin') {
      router.push('/');
    }
  }, [userData, isUserDataLoading, router]);

  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading || !userData || userData.role !== 'admin') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
          <h1 className="text-2xl font-bold">Quản lý Giáo viên Hướng dẫn</h1>
          <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
            <SupervisorManagementTable />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
