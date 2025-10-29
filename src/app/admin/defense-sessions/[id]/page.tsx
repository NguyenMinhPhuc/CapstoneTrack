

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, LinkIcon, Users, UserCheck, FileText, ShieldCheck, FileCheck2, Star, XCircle, ClipboardCheck, GraduationCap, Briefcase, Building, ChevronDown, ChevronUp } from 'lucide-react';
import { type DefenseSession, type DefenseRegistration, type Student, type StudentWithRegistrationDetails, type Rubric } from '@/lib/types';
import { StudentRegistrationTable } from '@/components/student-registration-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { WithdrawnStudentsDialog } from '@/components/withdrawn-students-dialog';
import { ExemptedStudentsDialog } from '@/components/exempted-students-dialog';
import { ExportReportButton } from '@/components/export-report-button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


export default function DefenseSessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isWithdrawnDialogOpen, setIsWithdrawnDialogOpen] = useState(false);
  const [isExemptedDialogOpen, setIsExemptedDialogOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(true);
  
  const sessionId = params.id as string;

  const sessionDocRef = useMemoFirebase(
    () => (sessionId ? doc(firestore, 'graduationDefenseSessions', sessionId) : null),
    [firestore, sessionId]
  );
  
  const { data: session, isLoading: isSessionLoading } = useDoc<DefenseSession>(sessionDocRef);

  // Fetch all 4 rubrics
  const councilGradRubricDocRef = useMemoFirebase(() => (session?.councilGraduationRubricId ? doc(firestore, 'rubrics', session.councilGraduationRubricId) : null), [firestore, session]);
  const councilInternRubricDocRef = useMemoFirebase(() => (session?.councilInternshipRubricId ? doc(firestore, 'rubrics', session.councilInternshipRubricId) : null), [firestore, session]);
  const supervisorGradRubricDocRef = useMemoFirebase(() => (session?.supervisorGraduationRubricId ? doc(firestore, 'rubrics', session.supervisorGraduationRubricId) : null), [firestore, session]);
  const companyInternRubricDocRef = useMemoFirebase(() => (session?.companyInternshipRubricId ? doc(firestore, 'rubrics', session.companyInternshipRubricId) : null), [firestore, session]);

  const { data: councilGraduationRubric, isLoading: isCouncilGradRubricLoading } = useDoc<Rubric>(councilGradRubricDocRef);
  const { data: councilInternshipRubric, isLoading: isCouncilInternRubricLoading } = useDoc<Rubric>(councilInternRubricDocRef);
  const { data: supervisorGraduationRubric, isLoading: isSupervisorGradRubricLoading } = useDoc<Rubric>(supervisorGradRubricDocRef);
  const { data: companyInternshipRubric, isLoading: isCompanyInternRubricLoading } = useDoc<Rubric>(companyInternRubricDocRef);

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
    }).filter(reg => reg.status === 'studying'); // Only include students with 'studying' status
}, [registrations, allStudents]);

 const stats = useMemo(() => {
    if (!combinedRegistrationData) {
      return { 
          studentCount: 0, 
          supervisorCount: 0, 
          projectCount: 0,
          reportingGraduationCount: 0,
          reportingInternshipCount: 0,
          exemptedGraduationCount: 0,
          withdrawnGraduationCount: 0,
          withdrawnInternshipCount: 0,
          internshipCompanyCount: 0,
          supervisorDetails: [],
          withdrawnStudents: [], // This can be refined later if needed
          exemptedStudents: [], // This can be refined later if needed
       };
    }

    const studentCount = combinedRegistrationData.length;
    const reportingGraduationCount = combinedRegistrationData.filter(r => r.graduationStatus === 'reporting').length;
    const exemptedGraduationCount = combinedRegistrationData.filter(r => r.graduationStatus === 'exempted').length;
    const withdrawnGraduationCount = combinedRegistrationData.filter(r => r.graduationStatus === 'withdrawn').length;
    
    const reportingInternshipCount = combinedRegistrationData.filter(r => r.internshipStatus === 'reporting').length;
    const withdrawnInternshipCount = combinedRegistrationData.filter(r => r.internshipStatus === 'withdrawn').length;

    // For dialogs: you might want to specify which list to show
    const withdrawnStudents = combinedRegistrationData.filter(r => r.graduationStatus === 'withdrawn' || r.internshipStatus === 'withdrawn');
    const exemptedStudents = combinedRegistrationData.filter(r => r.graduationStatus === 'exempted');


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
    const internshipCompanyCount = new Set(combinedRegistrationData.filter(r => r.internship_companyName).map(r => r.internship_companyName)).size;

    return {
      studentCount,
      supervisorCount: supervisorMap.size,
      projectCount,
      reportingGraduationCount,
      reportingInternshipCount,
      exemptedGraduationCount,
      withdrawnGraduationCount,
      withdrawnInternshipCount,
      internshipCompanyCount,
      supervisorDetails,
      withdrawnStudents,
      exemptedStudents,
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

  const isLoading = isUserLoading || isUserDataLoading || isSessionLoading || areRegistrationsLoading || areStudentsLoading || 
                    isCouncilGradRubricLoading || isCouncilInternRubricLoading || isSupervisorGradRubricLoading || isCompanyInternRubricLoading;

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

  const getRubricName = (rubric: Rubric | null | undefined) => {
    return rubric ? rubric.name : 'Chưa gán';
  }

  const RubricInfo = ({ icon, label, rubric, isLoading }: { icon: React.ReactNode, label: string, rubric: Rubric | null | undefined, isLoading: boolean }) => (
      <div className="flex items-center gap-3">
        {icon}
        <div>
            <p className="font-semibold">{label}</p>
            <p className="text-primary hover:underline">
                {isLoading ? 'Đang tải...' : getRubricName(rubric)}
            </p>
        </div>
    </div>
  );

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
                        <ExportReportButton 
                            sessionId={sessionId} 
                            session={session} 
                            rubricIds={{
                                councilGraduation: session.councilGraduationRubricId,
                                councilInternship: session.councilInternshipRubricId,
                                supervisorGraduation: session.supervisorGraduationRubricId,
                                companyInternship: session.companyInternshipRubricId,
                            }}
                        />
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
                 <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                    <RubricInfo icon={<GraduationCap className="h-5 w-5 text-muted-foreground" />} label="HĐ chấm Tốt nghiệp" rubric={councilGraduationRubric} isLoading={isCouncilGradRubricLoading} />
                    <RubricInfo icon={<Briefcase className="h-5 w-5 text-muted-foreground" />} label="HĐ chấm Thực tập" rubric={councilInternshipRubric} isLoading={isCouncilInternRubricLoading} />
                    <RubricInfo icon={<GraduationCap className="h-5 w-5 text-muted-foreground" />} label="GVHD chấm Tốt nghiệp" rubric={supervisorGraduationRubric} isLoading={isSupervisorGradRubricLoading} />
                    <RubricInfo icon={<UserCheck className="h-5 w-5 text-muted-foreground" />} label="ĐV chấm Thực tập" rubric={companyInternshipRubric} isLoading={isCompanyInternRubricLoading} />
                </div>
            </CardContent>
        </Card>

        <Collapsible open={isStatsOpen} onOpenChange={setIsStatsOpen}>
            <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-xl font-semibold w-full">
                    {isStatsOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    Thống kê tổng quan
                </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Số sinh viên</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.studentCount}</div>
                        <p className="text-xs text-muted-foreground">Tổng số sinh viên đã đăng ký</p>
                        <div className="mt-4 space-y-4 text-sm">
                            <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-2"><GraduationCap className="h-4 w-4" /> Tốt nghiệp</h4>
                                <div className="space-y-1 pl-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-muted-foreground"><FileCheck2 className="h-4 w-4" /> Báo cáo TN</div>
                                        <span className="font-semibold">{stats.reportingGraduationCount}</span>
                                    </div>
                                    <Dialog open={isExemptedDialogOpen} onOpenChange={setIsExemptedDialogOpen}>
                                        <DialogTrigger asChild>
                                            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md -mx-2 px-2 py-1">
                                                 <div className="flex items-center gap-2 text-muted-foreground"><Star className="h-4 w-4" /> Đặc cách TN</div>
                                                <span className="font-semibold">{stats.exemptedGraduationCount}</span>
                                            </div>
                                        </DialogTrigger>
                                        <ExemptedStudentsDialog
                                            students={stats.exemptedStudents}
                                            onFinished={() => setIsExemptedDialogOpen(false)}
                                        />
                                    </Dialog>
                                     <Dialog open={isWithdrawnDialogOpen} onOpenChange={setIsWithdrawnDialogOpen}>
                                        <DialogTrigger asChild>
                                            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md -mx-2 px-2 py-1">
                                                <div className="flex items-center gap-2 text-muted-foreground"><XCircle className="h-4 w-4" /> Bỏ báo cáo TN</div>
                                                <span className="font-semibold">{stats.withdrawnGraduationCount}</span>
                                            </div>
                                         </DialogTrigger>
                                        <WithdrawnStudentsDialog
                                            students={stats.withdrawnStudents}
                                            onFinished={() => setIsWithdrawnDialogOpen(false)}
                                        />
                                    </Dialog>
                                </div>
                            </div>
                             <Separator />
                             <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-2"><Briefcase className="h-4 w-4" /> Thực tập</h4>
                                 <div className="space-y-1 pl-6">
                                    <div className="flex items-center justify-between">
                                         <div className="flex items-center gap-2 text-muted-foreground"><FileCheck2 className="h-4 w-4" /> Báo cáo TT</div>
                                        <span className="font-semibold">{stats.reportingInternshipCount}</span>
                                    </div>
                                     <Dialog open={isWithdrawnDialogOpen} onOpenChange={setIsWithdrawnDialogOpen}>
                                        <DialogTrigger asChild>
                                            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md -mx-2 px-2 py-1">
                                                <div className="flex items-center gap-2 text-muted-foreground"><XCircle className="h-4 w-4" /> Bỏ báo cáo TT</div>
                                                <span className="font-semibold">{stats.withdrawnInternshipCount}</span>
                                            </div>
                                         </DialogTrigger>
                                        <WithdrawnStudentsDialog
                                            students={stats.withdrawnStudents}
                                            onFinished={() => setIsWithdrawnDialogOpen(false)}
                                        />
                                    </Dialog>
                                </div>
                            </div>
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
                      <CardTitle className="text-sm font-medium">Thống kê Đề tài & Thực tập</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                <span>Số đề tài</span>
                            </div>
                            <div className="text-2xl font-bold">{stats.projectCount}</div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Building className="h-4 w-4" />
                                <span>Số công ty thực tập</span>
                            </div>
                            <div className="text-2xl font-bold">{stats.internshipCompanyCount}</div>
                        </div>
                    </CardContent>
                  </Card>
                </div>
            </CollapsibleContent>
        </Collapsible>

        <StudentRegistrationTable 
            sessionId={sessionId} 
            sessionType={session.sessionType}
            initialData={combinedRegistrationData}
            isLoading={isLoading}
        />

    </main>
  );
}

    
