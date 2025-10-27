
'use client';
import { Suspense, useMemo } from 'react';
import { DashboardStats } from '@/components/dashboard-stats';
import { DashboardApplicationsTable } from '@/components/dashboard-applications-table';
import { DashboardProgressChart } from '@/components/dashboard-progress-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { doc, collection, query, where } from 'firebase/firestore';
import { StudentDashboard } from '@/components/student-dashboard';
import type { SystemUser, GraduationDefenseSession } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Calendar, CalendarIcon, Link as LinkIcon } from 'lucide-react';


function SupervisorDashboard() {
  const firestore = useFirestore();
  const sessionsQuery = useMemoFirebase(() => query(collection(firestore, 'graduationDefenseSessions'), where('status', 'in', ['ongoing', 'upcoming'])), [firestore]);
  const { data: availableSessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);

  const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    return timestamp;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <Suspense fallback={<DashboardStats.Skeleton />}>
        <DashboardStats />
      </Suspense>
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8 space-y-8 lg:space-y-0">
        <div className="lg:col-span-2 space-y-8">
          <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
            <DashboardApplicationsTable />
          </Suspense>
           {isLoadingSessions ? <Skeleton className="h-64 w-full" /> : (
            availableSessions && availableSessions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar /> Các đợt báo cáo
                  </CardTitle>
                  <CardDescription>Các đợt đang và sắp diễn ra trong năm học.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-4">
                      {availableSessions.map((session) => (
                        <div key={session.id} className="p-3 border rounded-lg bg-muted/50">
                          <div className="flex justify-between items-center">
                            <p className="font-semibold">{session.name}</p>
                            <Badge variant={session.status === 'ongoing' ? 'default' : 'secondary'}>{session.status}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2 space-y-1">
                            <p>Bắt đầu: {toDate(session.startDate) ? format(toDate(session.startDate)!, 'dd/MM/yyyy') : 'N/A'}</p>
                            <p>Hạn ĐK: {toDate(session.registrationDeadline) ? format(toDate(session.registrationDeadline)!, 'dd/MM/yyyy') : 'N/A'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )
          )}
        </div>
        <div className="lg:col-span-1">
          <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
            <DashboardProgressChart />
          </Suspense>
        </div>
      </div>
    </div>
  );
}


export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<SystemUser>(userDocRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading || !user || !userData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>
    );
  }

  if (userData.role === 'student') {
    return <StudentDashboard user={user} />;
  }

  // Admin and Supervisor Dashboard
  return <SupervisorDashboard />;
}
