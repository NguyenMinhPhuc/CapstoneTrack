
'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, UserIcon, LinkIcon } from 'lucide-react';
import { type GraduationDefenseSession } from '@/lib/types';
import { StudentRegistrationTable } from '@/components/student-registration-table';

export default function DefenseSessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const sessionId = params.id as string;

  const sessionDocRef = useMemoFirebase(
    () => (sessionId ? doc(firestore, 'graduationDefenseSessions', sessionId) : null),
    [firestore, sessionId]
  );
  
  const { data: session, isLoading: isSessionLoading } = useDoc<GraduationDefenseSession>(sessionDocRef);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  if (isUserLoading || isUserDataLoading || isSessionLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-10 w-1/3 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full mt-8" />
      </div>
    );
  }

  if (!user || userData?.role !== 'admin') {
    router.push('/');
    return null;
  }
  
  if (!session) {
      return <div>Đợt báo cáo không tồn tại.</div>;
  }
  
  const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    return timestamp;
  };

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="p-4 sm:p-6 lg:p-8 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">{session.name}</CardTitle>
                    <CardDescription>{session.description || 'Không có mô tả.'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                        <div className="flex items-center gap-3">
                            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="font-semibold">Ngày bắt đầu</p>
                                <p>{toDate(session.startDate) ? format(toDate(session.startDate)!, 'PPP') : 'N/A'}</p>
                            </div>
                        </div>
                         <div className="flex items-center gap-3">
                            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="font-semibold">Hạn đăng ký</p>
                                <p>{toDate(session.registrationDeadline) ? format(toDate(session.registrationDeadline)!, 'PPP') : 'N/A'}</p>
                            </div>
                        </div>
                         <div className="flex items-center gap-3">
                            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="font-semibold">Ngày báo cáo dự kiến</p>
                                <p>{toDate(session.expectedReportDate) ? format(toDate(session.expectedReportDate)!, 'PPP') : 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <UserIcon className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="font-semibold">Trạng thái</p>
                                <Badge>{session.status}</Badge>
                            </div>
                        </div>
                         {session.zaloGroupLink && (
                             <div className="flex items-center gap-3 md:col-span-2">
                                <LinkIcon className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="font-semibold">Nhóm Zalo</p>
                                    <a href={session.zaloGroupLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                                        {session.zaloGroupLink}
                                    </a>
                                </div>
                            </div>
                         )}
                    </div>
                </CardContent>
            </Card>

            <StudentRegistrationTable sessionId={sessionId} />

        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
