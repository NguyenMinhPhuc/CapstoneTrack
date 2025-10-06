
'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, LinkIcon, Users, UserCheck, FileText, ShieldCheck } from 'lucide-react';
import { type GraduationDefenseSession, type DefenseRegistration, type Student, type StudentWithRegistrationDetails } from '@/lib/types';
import { StudentRegistrationTable } from '@/components/student-registration-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
  
  const registrationsQuery = useMemoFirebase(
    () => (sessionId ? query(collection(firestore, 'defenseRegistrations'), where('sessionId', '==', sessionId)) : null),
    [firestore, sessionId]
  );
  
  const { data: registrations, isLoading: areRegistrationsLoading } = useCollection<DefenseRegistration>(registrationsQuery);

  const studentsCollectionRef = useMemoFirebase(
    () => collection(firestore, 'students'),
    [firestore]
  );
  const { data: allStudents, isLoading: areStudentsLoading } = useCollection<Student>(studentsCollectionRef);

  const combinedRegistrationData = useMemo<StudentWithRegistrationDetails[] | null>(() => {
    if (!registrations || !allStudents) {
      return null;
    }
    const studentMap = new Map(allStudents.map(s => [s.id, s]));

    return registrations.map(reg => {
      const studentData = studentMap.get(reg.studentDocId);
      return {
        ...reg,
        status: studentData?.status || 'studying', // Default to 'studying' if not found
      };
    });
  }, [registrations, allStudents]);

  const stats = useMemo(() => {
    if (!registrations) {
      return { studentCount: 0, supervisorCount: 0, projectCount: 0 };
    }
    const studentCount = registrations.length;
    const supervisorSet = new Set(registrations.map(r => r.supervisorName).filter(Boolean));
    const projectCount = registrations.filter(r => r.projectTitle).length;
    
    return {
      studentCount,
      supervisorCount: supervisorSet.size,
      projectCount,
    };
  }, [registrations]);


  useEffect(() => {
    const isLoading = isUserLoading || isUserDataLoading;
    if (isLoading) return;

    if (!user) {
      router.push('/login');
    } else if (userData && userData.role !== 'admin') {
      router.push('/');
    }
  }, [user, userData, isUserLoading, isUserDataLoading, router]);

  const isLoading = isUserLoading || isUserDataLoading || isSessionLoading || areRegistrationsLoading || areStudentsLoading;

  if (isLoading || !user || !userData || userData.role !== 'admin') {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
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
      </main>
    );
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
    <main className="p-4 sm:p-6 lg:p-8 space-y-8">
         <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                     <div>
                        <CardTitle className="text-3xl">{session.name}</CardTitle>
                        <CardDescription className="mt-1">{session.description || 'Không có mô tả.'}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge>{session.status}</Badge>
                         <Button asChild variant="outline">
                            <Link href={`/admin/defense-sessions/${sessionId}/council`}>
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                Quản lý Hội đồng
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm">
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
                     {session.zaloGroupLink && (
                         <div className="flex items-center gap-3">
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

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Số sinh viên</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.studentCount}</div>
              <p className="text-xs text-muted-foreground">Tổng số sinh viên đã đăng ký</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Số GVHD</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.supervisorCount}</div>
               <p className="text-xs text-muted-foreground">Tổng số GVHD duy nhất</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Số đề tài</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.projectCount}</div>
               <p className="text-xs text-muted-foreground">Tổng số đề tài đã được nhập</p>
            </CardContent>
          </Card>
        </div>

        <StudentRegistrationTable 
            sessionId={sessionId} 
            initialData={combinedRegistrationData}
            isLoading={isLoading}
        />

    </main>
  );
}

    