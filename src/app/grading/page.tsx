'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck } from 'lucide-react';

export default function GradingPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  useEffect(() => {
    const isLoading = isUserLoading || isUserDataLoading;
    if (isLoading) return;

    if (!user) {
      router.push('/login');
    } else if (userData && userData.role !== 'supervisor' && userData.role !== 'admin') {
      // Allow admin to see this page for now
      router.push('/');
    }
  }, [user, userData, isUserLoading, isUserDataLoading, router]);

  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading || !user || !userData) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="p-8 space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-6 w-3/4" />
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck />
            Phiếu Chấm Điểm
          </CardTitle>
          <CardDescription>
            Chức năng chấm điểm cho các hội đồng và tiểu ban sẽ được triển khai tại đây.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Xin chào, {userData.email}.</p>
          <p className="mt-2 text-muted-foreground">
            Tính năng này đang trong quá trình phát triển. Bạn sẽ sớm có thể xem danh sách sinh viên và thực hiện chấm điểm tại đây.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
