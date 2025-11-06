'use client';

import { useEffect, useState, useMemo } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { Student, DefenseRegistration, GraduationDefenseSession, WeeklyProgressReport, EarlyInternship, EarlyInternshipWeeklyReport, SystemSettings } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { User as UserIcon, Book, UserCheck, Calendar, Info, FileSignature, FileUp, Activity, Clock, Building, Link as LinkIcon, CalendarIcon, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { differenceInWeeks, startOfWeek, format, isWithinInterval, sub, add } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Dialog, DialogTrigger, DialogContent } from './ui/dialog';
import { ViewStudentEarlyInternshipProgressDialog } from './view-student-early-internship-progress-dialog';
import { ScrollArea } from './ui/scroll-area';
import { ProgressTimeline } from './progress-timeline';

interface StudentDashboardProps {
  user: User;
}

const registrationStatusConfig = {
    pending: { label: "Chờ GVHD xác nhận", variant: "secondary" as const },
    approved: { label: "Đã được xác nhận", variant: "default" as const },
    rejected: { label: "Bị từ chối", variant: "destructive" as const },
    default: { label: "Chưa đăng ký", variant: "outline" as const },
};

const internshipRegStatusConfig = {
  pending: { label: "Chờ duyệt", variant: "secondary" as const },
  approved: { label: "Đã duyệt", variant: "default" as const },
  rejected: { label: "Bị từ chối", variant: "destructive" as const },
  default: { label: "Chưa ĐK", variant: "outline" as const },
}

const earlyInternshipStatusLabel: Record<EarlyInternship['status'], string> = {
  pending_admin_approval: 'Chờ duyệt',
  pending_company_approval: 'Chờ duyệt',
  ongoing: 'Đang thực tập',
  completed: 'Hoàn thành',
  rejected_by_admin: 'Admin từ chối',
  rejected_by_company: 'ĐV từ chối',
  cancelled: 'Đã hủy',
};

const earlyInternshipStatusVariant: Record<EarlyInternship['status'], 'secondary' | 'default' | 'outline' | 'destructive'> = {
  pending_admin_approval: 'secondary',
  pending_company_approval: 'secondary',
  ongoing: 'default',
  completed: 'outline',
  rejected_by_admin: 'destructive',
  rejected_by_company: 'destructive',
  cancelled: 'destructive',
};

const statusLabel: Record<string, string> = {
  upcoming: 'Sắp diễn ra',
  ongoing: 'Đang thực hiện',
  completed: 'Hoàn thành',
};

export function StudentDashboard({ user }: StudentDashboardProps) {
  const firestore = useFirestore();
  const [activeRegistration, setActiveRegistration] = useState<DefenseRegistration | null>(null);
  const [activeSession, setActiveSession] = useState<GraduationDefenseSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);

  const studentDocRef = useMemoFirebase(() => doc(firestore, 'students', user.uid), [firestore, user.uid]);
  const { data: studentData, isLoading: isLoadingStudent } = useDoc<Student>(studentDocRef);
  
  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'systemSettings', 'features'), [firestore]);
  const { data: settings } = useDoc<SystemSettings>(settingsDocRef);
  const goalHours = settings?.earlyInternshipGoalHours ?? 700;

  const sessionsQuery = useMemoFirebase(() => query(collection(firestore, 'graduationDefenseSessions'), where('status', 'in', ['ongoing', 'upcoming'])), [firestore]);
  const { data: availableSessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);

  const reportsQuery = useMemoFirebase(
    () => activeRegistration ? query(collection(firestore, 'weeklyProgressReports'), where('registrationId', '==', activeRegistration.id)) : null,
    [firestore, activeRegistration]
  );
  const { data: pastReports } = useCollection<WeeklyProgressReport>(reportsQuery);
  
  const earlyInternshipQuery = useMemoFirebase(
    () => query(collection(firestore, 'earlyInternships'), where('studentId', '==', user.uid)),
    [firestore, user.uid]
  );
  const { data: earlyInternships, isLoading: isLoadingEarlyInternships } = useCollection<EarlyInternship>(earlyInternshipQuery);

  const activeEarlyInternship = useMemo(() => {
    if (!earlyInternships || earlyInternships.length === 0) return null;
    return [...earlyInternships].sort((a, b) => ((b.startDate?.toDate()?.getTime() || 0) - (a.startDate?.toDate()?.getTime() || 0)))[0];
  }, [earlyInternships]);

  const earlyInternshipReportsQuery = useMemoFirebase(
    () => activeEarlyInternship ? query(collection(firestore, 'earlyInternshipWeeklyReports'), where('earlyInternshipId', '==', activeEarlyInternship.id)) : null,
    [firestore, activeEarlyInternship]
  );
  const { data: earlyInternshipReports } = useCollection<EarlyInternshipWeeklyReport>(earlyInternshipReportsQuery);

  const earlyInternshipProgress = useMemo(() => {
    const approvedReports = earlyInternshipReports?.filter(report => report.status === 'approved') || [];
    const totalHours = approvedReports.reduce((sum, report) => sum + report.hours, 0);
    return {
      totalHours,
      goalHours,
      percentage: goalHours > 0 ? (totalHours / goalHours) * 100 : 0,
    };
  }, [earlyInternshipReports, goalHours]);


  const weeklyProgress = useMemo(() => {
    const totalWeeks = 15; // Set a fixed 15-week duration
    if (!activeSession || !pastReports) {
      return { totalWeeks: totalWeeks, reportedWeeks: 0 };
    }
    
    const reportedWeeks = pastReports.length;

    return {
      totalWeeks: totalWeeks,
      reportedWeeks,
    };
  }, [activeSession, pastReports]);

  useEffect(() => {
    if (!user || !firestore) return;

    const findActiveRegistration = async () => {
      setIsLoading(true);
      try {
        // 1. Find all registrations for the current student in active sessions.
        const activeSessionIds = availableSessions?.map(s => s.id) || [];
        if (activeSessionIds.length === 0) {
            setIsLoading(false);
            return;
        }

        const registrationQuery = query(
          collection(firestore, 'defenseRegistrations'),
          where('studentDocId', '==', user.uid),
          where('sessionId', 'in', activeSessionIds)
        );
        const registrationSnapshot = await getDocs(registrationQuery);

        if (!registrationSnapshot.empty) {
          // 2. A registration exists. Now get that specific session's data.
          const regData = { id: registrationSnapshot.docs[0].id, ...registrationSnapshot.docs[0].data() } as DefenseRegistration;
          setActiveRegistration(regData);

          const sessionData = availableSessions?.find(s => s.id === regData.sessionId);
          if (sessionData) {
            setActiveSession(sessionData);
          }
        } else {
          // 3. No registration found, but we might still have an active session to show generally.
          const currentSession = availableSessions?.find(s => s.status === 'ongoing') || availableSessions?.[0] || null;
          setActiveSession(currentSession);
        }

      } catch (error) {
        console.error("Error finding active registration:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if(!isLoadingSessions) {
        findActiveRegistration();
    }
  }, [user, firestore, availableSessions, isLoadingSessions]);
  
  const toDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    // Handle cases where it might already be a Date object
    if (timestamp instanceof Date) {
        return timestamp;
    }
    return null;
  };
  
    const reportSubmission = useMemo(() => {
    if (!activeSession?.expectedReportDate) return null;
    
    const reportDate = toDate(activeSession.expectedReportDate);
    if (!reportDate) return null;

    const startDate = sub(reportDate, { weeks: 2 });
    const endDate = sub(reportDate, { weeks: 1 });
    const now = new Date();

    return {
        startDate,
        endDate,
        isWindowOpen: isWithinInterval(now, { start: startDate, end: endDate }),
    }
    }, [activeSession?.expectedReportDate]);

    const canSubmitReport = (reportSubmission?.isWindowOpen || settings?.forceOpenReportSubmission);

     const graduationTimelineSteps = [
        { 
            name: "Đăng ký đề tài", 
            status: activeRegistration?.projectRegistrationStatus === 'approved' ? 'completed' : (activeRegistration?.projectTitle ? 'current' : 'pending'),
            date: toDate(activeSession?.registrationDeadline),
            description: "Hạn chót"
        },
        { 
            name: "Nộp thuyết minh", 
            status: activeRegistration?.proposalStatus === 'approved' ? 'completed' : (activeRegistration?.projectRegistrationStatus === 'approved' ? 'current' : 'pending'),
            date: toDate(activeSession?.registrationDeadline) ? add(toDate(activeSession?.registrationDeadline)!, { weeks: 2}) : null,
            description: "Hạn chót (dự kiến)"
        },
        { 
            name: "Thực hiện & Báo cáo tuần", 
            status: activeRegistration?.proposalStatus === 'approved' && (!canSubmitReport) ? 'current' : (activeRegistration?.proposalStatus === 'approved' ? 'completed' : 'pending')
        },
        { 
            name: "Nộp báo cáo tốt nghiệp", 
            status: activeRegistration?.reportStatus === 'approved' ? 'completed' : (canSubmitReport && activeRegistration?.proposalStatus === 'approved' ? 'current' : 'pending'),
            date: reportSubmission?.endDate || null,
            description: "Hạn chót"
        },
        { 
            name: "Báo cáo trước hội đồng", 
            status: activeRegistration?.reportStatus === 'approved' ? 'current' : 'pending',
            date: toDate(activeSession?.expectedReportDate),
            description: "Ngày báo cáo (dự kiến)"
        },
    ];

    const internshipTimelineSteps = [
        { 
            name: "Đăng ký thực tập", 
            status: activeRegistration?.internshipRegistrationStatus === 'approved' ? 'completed' : (activeRegistration?.internship_companyName ? 'current' : 'pending'),
            date: toDate(activeSession?.registrationDeadline),
            description: "Hạn chót"
        },
        { 
            name: "Nộp giấy tờ thực tập", 
            status: activeRegistration?.internship_acceptanceLetterLink ? 'completed' : (activeRegistration?.internshipRegistrationStatus === 'approved' ? 'current' : 'pending'),
            date: toDate(activeSession?.registrationDeadline) ? add(toDate(activeSession?.registrationDeadline)!, { weeks: 2}) : null,
            description: "Hạn chót (dự kiến)"
        },
        { 
            name: "Tiến hành thực tập", 
            status: activeRegistration?.internship_acceptanceLetterLink && !canSubmitReport ? 'current' : (activeRegistration?.internship_acceptanceLetterLink ? 'completed' : 'pending')
        },
        { 
            name: "Nộp báo cáo & giấy tờ", 
            status: activeRegistration?.internship_reportLink ? 'completed' : (canSubmitReport && activeRegistration?.internship_acceptanceLetterLink ? 'current' : 'pending'),
            date: reportSubmission?.endDate || null,
            description: "Hạn chót"
        },
        { 
            name: "Báo cáo trước hội đồng", 
            status: activeRegistration?.internship_reportLink ? 'current' : 'pending',
            date: toDate(activeSession?.expectedReportDate),
            description: "Ngày báo cáo (dự kiến)"
        },
    ];


  if (isLoading || isLoadingStudent || isLoadingEarlyInternships || isLoadingSessions) {
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
                <div className="lg:col-span-2 space-y-8">
                    <Skeleton className="h-80 w-full" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <Skeleton className="h-64 w-full" />
                         <Skeleton className="h-64 w-full" />
                    </div>
                </div>
            </div>
        </div>
    )
  }

  const regStatusKey = activeRegistration?.projectRegistrationStatus || 'default';
  const regStatus = registrationStatusConfig[regStatusKey] || registrationStatusConfig.default;

  const internshipRegStatusKey = activeRegistration?.internshipRegistrationStatus || 'default';
  const internshipRegStatus = internshipRegStatusConfig[internshipRegStatusKey] || internshipRegStatusConfig.default;

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon /> Thông tin sinh viên
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Họ và tên</span>
                    <span className="font-semibold">{studentData?.firstName} {studentData?.lastName}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">MSSV</span>
                    <span className="font-semibold">{studentData?.studentId}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Lớp</span>
                    <span className="font-semibold">{studentData?.className || 'N/A'}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Chuyên ngành</span>
                    <span className="font-semibold">{studentData?.major || 'N/A'}</span>
                </div>
            </CardContent>
          </Card>
           
          {availableSessions && availableSessions.length > 0 && (
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
                          <Badge variant={session.status === 'ongoing' ? 'default' : 'secondary'}>
                            {statusLabel[session.status] || session.status}
                          </Badge>
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
          )}

          {activeEarlyInternship && (
             <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock /> Thông tin Thực tập sớm
                </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                   <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="font-medium">Tiến độ</p>
                            <p className="text-sm text-muted-foreground">{earlyInternshipProgress.totalHours.toFixed(0)}/{earlyInternshipProgress.goalHours} giờ</p>
                        </div>
                        <Progress value={earlyInternshipProgress.percentage} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground flex items-center gap-1.5"><Building /> Công ty</p>
                        <p className="font-medium">{activeEarlyInternship.companyName}</p>
                    </div>
                     <div className="space-y-1">
                        <p className="text-muted-foreground flex items-center gap-1.5"><UserCheck /> GVHD</p>
                        <p className="font-medium">{activeEarlyInternship.supervisorName}</p>
                    </div>
                     <div className="space-y-1">
                        <p className="text-muted-foreground flex items-center gap-1.5"><Info /> Trạng thái</p>
                         <Badge variant={earlyInternshipStatusVariant[activeEarlyInternship.status] || 'secondary'}>
                            {earlyInternshipStatusLabel[activeEarlyInternship.status]}
                        </Badge>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
                        <DialogTrigger asChild>
                             <Button variant="secondary" className="w-full">
                                <Activity className="mr-2 h-4 w-4"/> Xem chi tiết tiến độ
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl">
                            <ViewStudentEarlyInternshipProgressDialog
                                internship={activeEarlyInternship}
                                reports={earlyInternshipReports || []}
                                onFinished={() => setIsProgressDialogOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                    {earlyInternshipProgress.totalHours >= earlyInternshipProgress.goalHours && (
                        <Button asChild className="w-full">
                            <Link href="/internship-registration"><FileUp className="mr-2 h-4 w-4"/> Đăng ký Báo cáo Thực tập</Link>
                        </Button>
                    )}
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/early-internship-registration"><Clock className="mr-2 h-4 w-4"/> Quản lý Thực tập sớm</Link>
                    </Button>
                </CardFooter>
            </Card>
          )}

        </div>
        
        {/* Right Column */}
        <div className="lg:col-span-2 space-y-8">
          {activeRegistration ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book /> Thông tin Học phần
                </CardTitle>
                <CardDescription>
                  Đây là thông tin về đề tài tốt nghiệp và thực tập bạn đã đăng ký trong đợt <span className="font-semibold">{activeSession?.name}</span>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Graduation Project Section */}
                {activeRegistration.graduationStatus === 'reporting' && (
                  <div className='space-y-4'>
                    <div>
                      <p className="text-sm text-muted-foreground">Tên đề tài</p>
                      <h3 className="text-xl font-semibold">{activeRegistration.projectTitle || "Chưa đăng ký đề tài"}</h3>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <p className="text-muted-foreground flex items-center gap-1.5"><UserCheck /> GVHD</p>
                            <p className="font-medium">{activeRegistration.supervisorName || "Chưa có"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground flex items-center gap-1.5"><Info /> Trạng thái đăng ký</p>
                            <Badge variant={regStatus.variant}>{regStatus.label}</Badge>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="font-medium">Tiến độ báo cáo hàng tuần</p>
                            <p className="text-sm text-muted-foreground">{weeklyProgress.reportedWeeks}/{weeklyProgress.totalWeeks} tuần</p>
                        </div>
                        <Progress value={(weeklyProgress.reportedWeeks / weeklyProgress.totalWeeks) * 100} />
                    </div>
                  </div>
                )}
                 
                 {/* Internship Section */}
                 {activeRegistration.internshipStatus === 'reporting' && (
                    <div className="space-y-4 pt-4 border-t">
                        <div>
                          <p className="text-sm text-muted-foreground">Đơn vị thực tập</p>
                          <h3 className="text-xl font-semibold">{activeRegistration.internship_companyName || "Chưa đăng ký"}</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                                <p className="text-muted-foreground flex items-center gap-1.5"><UserCheck /> NHD tại ĐV</p>
                                <p className="font-medium">{activeRegistration.internship_companySupervisorName || "Chưa có"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground flex items-center gap-1.5"><Info /> Trạng thái đăng ký</p>
                                <Badge variant={internshipRegStatus.variant}>{internshipRegStatus.label}</Badge>
                            </div>
                        </div>
                    </div>
                )}


              </CardContent>
               <CardFooter className="flex flex-col sm:flex-row gap-2">
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/topic-registration"><Book className="mr-2 h-4 w-4"/> Quản lý Đề tài</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/internship-registration"><Briefcase className="mr-2 h-4 w-4"/> Đăng ký Thực tập</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                         <Link href="/progress-report"><Activity className="mr-2 h-4 w-4"/> Báo cáo Tiến độ</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/report-submission"><FileUp className="mr-2 h-4 w-4"/> Nộp Báo cáo</Link>
                    </Button>
               </CardFooter>
            </Card>
          ) : (
             <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Chưa tham gia đợt báo cáo</AlertTitle>
                <AlertDescription>
                    Bạn hiện chưa được thêm vào một đợt báo cáo nào đang diễn ra. Vui lòng liên hệ quản trị viên để được hỗ trợ.
                </AlertDescription>
             </Alert>
          )}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Lộ trình Tốt nghiệp</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ProgressTimeline steps={graduationTimelineSteps} />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Lộ trình Thực tập</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ProgressTimeline steps={internshipTimelineSteps} />
                    </CardContent>
                </Card>
           </div>
        </div>
      </div>
    </main>
  );
}
