'use client';

import { useEffect, useState, useMemo } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { Student, DefenseRegistration, GraduationDefenseSession, WeeklyProgressReport } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { User as UserIcon, Book, UserCheck, Calendar, Info, FileSignature, FileUp, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { differenceInWeeks, startOfWeek } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';

interface StudentDashboardProps {
  user: User;
}

const registrationStatusConfig = {
    pending: { label: "Chờ GVHD xác nhận", variant: "secondary" as const },
    approved: { label: "Đã được xác nhận", variant: "default" as const },
    rejected: { label: "Bị từ chối", variant: "destructive" as const },
    default: { label: "Chưa đăng ký", variant: "outline" as const },
};

export function StudentDashboard({ user }: StudentDashboardProps) {
  const firestore = useFirestore();
  const [activeRegistration, setActiveRegistration] = useState<DefenseRegistration | null>(null);
  const [activeSession, setActiveSession] = useState<GraduationDefenseSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const studentDocRef = useMemoFirebase(() => doc(firestore, 'students', user.uid), [firestore, user.uid]);
  const { data: studentData, isLoading: isLoadingStudent } = useDoc<Student>(studentDocRef);

  const reportsQuery = useMemoFirebase(
    () => activeRegistration ? query(collection(firestore, 'weeklyProgressReports'), where('registrationId', '==', activeRegistration.id)) : null,
    [firestore, activeRegistration]
  );
  const { data: pastReports } = useCollection<WeeklyProgressReport>(reportsQuery);

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

  if (isLoading || isLoadingStudent) {
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-32 w-full" />
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
                      <CardTitle className="flex items-center gap-2">
                          <Calendar /> Đợt báo cáo hiện tại
                      </CardTitle>
                  </CardHeader>
                   <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Tên đợt</span>
                            <span className="font-semibold">{activeSession.name}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Trạng thái</span>
                            <Badge>{activeSession.status}</Badge>
                        </div>
                   </CardContent>
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
