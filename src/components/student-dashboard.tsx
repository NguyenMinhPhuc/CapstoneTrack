'use client';

import { useEffect, useState, useMemo } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { Student, DefenseRegistration, GraduationDefenseSession, WeeklyProgressReport, EarlyInternship, EarlyInternshipWeeklyReport } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { User as UserIcon, Book, UserCheck, Calendar, Info, FileSignature, FileUp, Activity, Clock, Building, Link as LinkIcon, CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { differenceInWeeks, startOfWeek, format } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Dialog, DialogTrigger, DialogContent } from './ui/dialog';
import { ViewStudentEarlyInternshipProgressDialog } from './view-student-early-internship-progress-dialog';

interface StudentDashboardProps {
  user: User;
}

const registrationStatusConfig = {
    pending: { label: "Chờ GVHD xác nhận", variant: "secondary" as const },
    approved: { label: "Đã được xác nhận", variant: "default" as const },
    rejected: { label: "Bị từ chối", variant: "destructive" as const },
    default: { label: "Chưa đăng ký", variant: "outline" as const },
};

const earlyInternshipStatusLabel: Record<EarlyInternship['status'], string> = {
  pending_approval: 'Chờ duyệt',
  ongoing: 'Đang thực tập',
  completed: 'Hoàn thành',
  rejected: 'Bị từ chối',
  cancelled: 'Đã hủy',
};

const earlyInternshipStatusVariant: Record<EarlyInternship['status'], 'secondary' | 'default' | 'outline' | 'destructive'> = {
  pending_approval: 'secondary',
  ongoing: 'default',
  completed: 'outline',
  rejected: 'destructive',
  cancelled: 'destructive',
};

export function StudentDashboard({ user }: StudentDashboardProps) {
  const firestore = useFirestore();
  const [activeRegistration, setActiveRegistration] = useState<DefenseRegistration | null>(null);
  const [activeSession, setActiveSession] = useState<GraduationDefenseSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);

  const studentDocRef = useMemoFirebase(() => doc(firestore, 'students', user.uid), [firestore, user.uid]);
  const { data: studentData, isLoading: isLoadingStudent } = useDoc<Student>(studentDocRef);

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
    return [...earlyInternships].sort((a, b) => (b.startDate?.toDate() || 0) - (a.startDate?.toDate() || 0))[0];
  }, [earlyInternships]);

  const earlyInternshipReportsQuery = useMemoFirebase(
    () => activeEarlyInternship ? query(collection(firestore, 'earlyInternshipWeeklyReports'), where('earlyInternshipId', '==', activeEarlyInternship.id)) : null,
    [firestore, activeEarlyInternship]
  );
  const { data: earlyInternshipReports } = useCollection<EarlyInternshipWeeklyReport>(earlyInternshipReportsQuery);

  const earlyInternshipProgress = useMemo(() => {
    const totalHours = earlyInternshipReports?.reduce((sum, report) => sum + report.hours, 0) || 0;
    const goalHours = 700;
    return {
      totalHours,
      goalHours,
      percentage: (totalHours / goalHours) * 100,
    };
  }, [earlyInternshipReports]);


  const weeklyProgress = useMemo(() => {
    const totalWeeksInSemester = 15; // Set a fixed 15-week duration
    if (!activeSession || !pastReports) {
      return { totalWeeks: totalWeeksInSemester, reportedWeeks: 0 };
    }
    
    const reportedWeeks = pastReports.length;

    return {
      totalWeeks: totalWeeksInSemester,
      reportedWeeks,
    };
  }, [activeSession, pastReports]);

  useEffect(() => {
    if (!user || !firestore) return;

    const findActiveRegistration = async () => {
      setIsLoading(true);
      try {
        const sessionsQuery = query(
          collection(firestore, 'graduationDefenseSessions'),
          where('status', 'in', ['ongoing', 'upcoming'])
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);

        if (sessionsSnapshot.empty) {
          setIsLoading(false);
          return;
        }
        
        const sessionData = sessionsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as GraduationDefenseSession))
            .sort((a,b) => (a.status === 'ongoing' ? -1 : 1) - (b.status === 'ongoing' ? -1 : 1))[0]; // Prioritize ongoing session

        setActiveSession(sessionData);

        const registrationQuery = query(
          collection(firestore, 'defenseRegistrations'),
          where('sessionId', '==', sessionData.id),
          where('studentDocId', '==', user.uid)
        );
        const registrationSnapshot = await getDocs(registrationQuery);

        if (!registrationSnapshot.empty) {
          setActiveRegistration({ id: registrationSnapshot.docs[0].id, ...registrationSnapshot.docs[0].data() } as DefenseRegistration);
        }
      } catch (error) {
        console.error("Error finding active registration:", error);
      } finally {
        setIsLoading(false);
      }
    };

    findActiveRegistration();
  }, [user, firestore]);
  
  const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    return timestamp;
  };


  if (isLoading || isLoadingStudent || isLoadingEarlyInternships) {
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
                </div>
            </div>
        </div>
    )
  }

  const regStatusKey = activeRegistration?.projectRegistrationStatus || 'default';
  const regStatus = registrationStatusConfig[regStatusKey] || registrationStatusConfig.default;

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
           {activeSession && (
              <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="flex items-center gap-2">
                            <Calendar /> Đợt báo cáo hiện tại
                        </CardTitle>
                        <Badge>{activeSession.status}</Badge>
                    </div>
                     <CardDescription>{activeSession.name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="font-semibold">Ngày bắt đầu</p>
                            <p>{toDate(activeSession.startDate) ? format(toDate(activeSession.startDate)!, 'PPP') : 'N/A'}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-3">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="font-semibold">Hạn đăng ký</p>
                            <p>{toDate(activeSession.registrationDeadline) ? format(toDate(activeSession.registrationDeadline)!, 'PPP') : 'N/A'}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-3">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="font-semibold">Ngày báo cáo dự kiến</p>
                            <p>{toDate(activeSession.expectedReportDate) ? format(toDate(activeSession.expectedReportDate)!, 'PPP') : 'N/A'}</p>
                        </div>
                    </div>
                     {activeSession.zaloGroupLink && (
                         <div className="flex items-center gap-3">
                            <LinkIcon className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="font-semibold">Nhóm Zalo</p>
                                <a href={activeSession.zaloGroupLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                                    Tham gia
                                </a>
                             </div>
                         </div>
                     )}
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
                         <Badge variant={earlyInternshipStatusVariant[activeEarlyInternship.status]}>
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
        <div className="lg:col-span-2">
          {activeRegistration ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book /> Thông tin Đề tài
                </CardTitle>
                <CardDescription>
                  Đây là thông tin về đề tài tốt nghiệp bạn đã đăng ký.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
              </CardContent>
               <CardFooter className="flex flex-col sm:flex-row gap-2">
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/topic-registration"><Book className="mr-2 h-4 w-4"/> Quản lý Đề tài</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/proposal-submission"><FileSignature className="mr-2 h-4 w-4"/> Nộp Thuyết minh</Link>
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
        </div>
      </div>
    </main>
  );
}
