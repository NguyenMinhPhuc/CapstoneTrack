'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, LinkIcon, Users, UserCheck, FileText, ShieldCheck, FileCheck2, Star, XCircle } from 'lucide-react';
import { type GraduationDefenseSession, type DefenseRegistration, type Student, type StudentWithRegistrationDetails } from '@/lib/types';
import { StudentRegistrationTable } from '@/components/student-registration-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { WithdrawnStudentsDialog } from '@/components/withdrawn-students-dialog';


export default function DefenseSessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isWithdrawnDialogOpen, setIsWithdrawnDialogOpen] = useState(false);
  
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
        className: studentData?.className || '', // Add className
      };
    });
  }, [registrations, allStudents]);

  const stats = useMemo(() => {
    if (!combinedRegistrationData) {
      return { 
          studentCount: 0, 
          supervisorCount: 0, 
          projectCount: 0,
          reportingCount: 0,
          exemptedCount: 0,
          withdrawnCount: 0,
          supervisorDetails: [],
          withdrawnStudents: [],
       };
    }
    const studentCount = combinedRegistrationData.length;
    const reportingCount = combinedRegistrationData.filter(r => r.registrationStatus === 'reporting').length;
    const exemptedCount = combinedRegistrationData.filter(r => r.registrationStatus === 'exempted').length;
    const withdrawnCount = combinedRegistrationData.filter(r => r.registrationStatus === 'withdrawn').length;
    const withdrawnStudents = combinedRegistrationData.filter(r => r.registrationStatus === 'withdrawn');

    const supervisorMap = new Map<string, { projects: Set<string>, studentCount: number }>();
    combinedRegistrationData.forEach(reg => {
        if (reg.supervisorName) {
            if (!supervisorMap.has(reg.supervisorName)) {
                supervisorMap.set(reg.supervisorName, { projects: new Set(), studentCount: 0 });
            }
            const supervisorData = supervisorMap.get(reg.supervisorName)!;
            supervisorData.studentCount++;
            if (reg.projectTitle) {
                supervisorData.projects.add(reg.projectTitle);
            }
        }
    });

    const supervisorDetails = Array.from(supervisorMap.entries()).map(([name, data]) => ({
        name,
        projectCount: data.projects.size,
        studentCount: data.studentCount,
    }));
    
    const projectCount = new Set(combinedRegistrationData.filter(r => r.projectTitle).map(r => r.projectTitle)).size;


    return {
      studentCount,
      supervisorCount: supervisorMap.size,
      projectCount,
      reportingCount,
      exemptedCount,
      withdrawnCount,
      supervisorDetails,
      withdrawnStudents,
    };
  }, [combinedRegistrationData]);


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
                <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileCheck2 className="h-4 w-4 text-green-500" />
                            <span>Báo cáo</span>
                        </div>
                        <span className="font-semibold">{stats.reportingCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span>Đặc cách</span>
                        </div>
                        <span className="font-semibold">{stats.exemptedCount}</span>
                    </div>
                    <Dialog open={isWithdrawnDialogOpen} onOpenChange={setIsWithdrawnDialogOpen}>
                        <DialogTrigger asChild>
                            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md -mx-2 px-2 py-1">
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <span>Bỏ báo cáo</span>
                                </div>
                                <span className="font-semibold">{stats.withdrawnCount}</span>
                            </div>
                        </DialogTrigger>
                        <WithdrawnStudentsDialog
                            students={stats.withdrawnStudents}
                            onFinished={() => setIsWithdrawnDialogOpen(false)}
                        />
                    </Dialog>
                </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Số GVHD ({stats.supervisorCount})</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40">
                <div className="space-y-4">
                  {stats.supervisorDetails.length > 0 ? stats.supervisorDetails.map(sv => (
                    <div key={sv.name} className="text-sm">
                      <p className="font-semibold truncate">{sv.name}</p>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{sv.projectCount} đề tài</span>
                        <span>{sv.studentCount} sinh viên</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Chưa có GVHD nào.</p>
                  )}
                </div>
              </ScrollArea>
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
