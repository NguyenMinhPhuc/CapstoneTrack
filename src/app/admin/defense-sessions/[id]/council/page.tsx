
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CouncilManagement } from '@/components/council-management';
import { type GraduationDefenseSession } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';


export default function CouncilPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const sessionId = params.id as string;

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const sessionDocRef = useMemoFirebase(
    () => (sessionId ? doc(firestore, 'graduationDefenseSessions', sessionId) : null),
    [firestore, sessionId]
  );
  const { data: session, isLoading: isSessionLoading } = useDoc<GraduationDefenseSession>(sessionDocRef);

  useEffect(() => {
    const isLoading = isUserLoading || isUserDataLoading;
    if (isLoading) return;

    if (!user) {
      router.push('/login');
    } else if (userData && userData.role !== 'admin') {
      router.push('/');
    }
  }, [user, userData, isUserLoading, isUserDataLoading, router]);

  const isLoading = isUserLoading || isUserDataLoading || isSessionLoading;

  if (isLoading || !user || !userData || userData.role !== 'admin') {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="p-8 space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-6 w-3/4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
            <div className="lg:col-span-1 space-y-4">
                <Skeleton className="h-48 w-full" />
            </div>
            <div className="lg:col-span-2 space-y-4">
                 <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </main>
    );
  }
  
  if (!session) {
      return (
        <main className="p-4 sm:p-6 lg:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Lỗi</CardTitle>
                    <CardDescription>Không tìm thấy thông tin đợt báo cáo.</CardDescription>
                </CardHeader>
            </Card>
        </main>
      );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <CouncilManagement session={session} sessionId={sessionId} />
    </main>
  );
}

