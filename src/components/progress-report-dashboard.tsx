
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Send, Clock, CheckCircle, XCircle } from 'lucide-react';
import { type DefenseRegistration, type GraduationDefenseSession, type WeeklyProgressReport } from '@/lib/types';
import type { User } from 'firebase/auth';
import { differenceInWeeks, startOfWeek } from 'date-fns';
import { Button } from './ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { format } from 'date-fns';


const formSchema = z.object({
  workDone: z.string().min(10, { message: 'Vui lòng mô tả công việc đã làm.' }),
  nextWeekPlan: z.string().min(10, { message: 'Vui lòng mô tả kế hoạch tuần tới.' }),
});

const statusConfig = {
  pending_review: { label: "Chờ duyệt", icon: <Clock className="h-4 w-4" />, variant: "secondary" as const },
  approved: { label: "Đã duyệt", icon: <CheckCircle className="h-4 w-4 text-green-500" />, variant: "default" as const },
  rejected: { label: "Cần sửa", icon: <XCircle className="h-4 w-4 text-red-500" />, variant: "destructive" as const },
};


export function ProgressReportDashboard({ user }: { user: User }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeRegistration, setActiveRegistration] = useState<DefenseRegistration | null>(null);
  const [activeSession, setActiveSession] = useState<GraduationDefenseSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(0);

  const reportsQuery = useMemoFirebase(
    () => activeRegistration ? query(collection(firestore, 'weeklyProgressReports'), where('registrationId', '==', activeRegistration.id)) : null,
    [firestore, activeRegistration]
  );
  const { data: pastReports, isLoading: isLoadingReports } = useCollection<WeeklyProgressReport>(reportsQuery);

  const sortedReports = useMemo(() => {
    if (!pastReports) return [];
    return [...pastReports].sort((a, b) => b.weekNumber - a.weekNumber);
  }, [pastReports]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workDone: '',
      nextWeekPlan: '',
    },
  });

  useEffect(() => {
    if (!user || !firestore) return;

    const findActiveRegistration = async () => {
      setIsLoading(true);
      try {
        const sessionsQuery = query(collection(firestore, 'graduationDefenseSessions'), where('status', '==', 'ongoing'));
        const sessionsSnapshot = await getDocs(sessionsQuery);

        if (sessionsSnapshot.empty) {
          setIsLoading(false);
          return;
        }
        
        const sessionDoc = sessionsSnapshot.docs[0];
        const sessionData = { id: sessionDoc.id, ...sessionDoc.data() } as GraduationDefenseSession;
        setActiveSession(sessionData);

        const registrationQuery = query(
            collection(firestore, 'defenseRegistrations'),
            where('sessionId', '==', sessionData.id),
            where('studentDocId', '==', user.uid),
            where('projectRegistrationStatus', '==', 'approved')
        );
        const registrationSnapshot = await getDocs(registrationQuery);

        if (!registrationSnapshot.empty) {
          const regData = { id: registrationSnapshot.docs[0].id, ...registrationSnapshot.docs[0].data() } as DefenseRegistration;
          setActiveRegistration(regData);

          const sessionStartDate = sessionData.startDate.toDate();
          const today = new Date();
          const weekNum = differenceInWeeks(today, startOfWeek(sessionStartDate, { weekStartsOn: 1 })) + 1;
          setCurrentWeek(weekNum);
        }

      } catch (error) {
        console.error("Error finding active registration for progress report:", error);
      } finally {
        setIsLoading(false);
      }
    };

    findActiveRegistration();
  }, [user, firestore]);

  const canSubmitForCurrentWeek = useMemo(() => {
    if (!pastReports || currentWeek <= 0) return false;
    return !pastReports.some(report => report.weekNumber === currentWeek);
  }, [pastReports, currentWeek]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!activeRegistration || !activeSession) return;

    const reportData = {
        ...values,
        registrationId: activeRegistration.id,
        studentId: user.uid,
        supervisorId: activeRegistration.supervisorId || '',
        sessionId: activeSession.id,
        weekNumber: currentWeek,
        submissionDate: serverTimestamp(),
        status: 'pending_review' as const,
    };
    
    addDoc(collection(firestore, 'weeklyProgressReports'), reportData)
        .then(() => {
            toast({ title: "Thành công", description: `Đã nộp báo cáo cho tuần ${currentWeek}.` });
            form.reset();
        })
        .catch(error => {
            const contextualError = new FirestorePermissionError({
                path: 'weeklyProgressReports',
                operation: 'create',
                requestResourceData: reportData,
            });
            errorEmitter.emit('permission-error', contextualError);
        });
  }
  
  if (isLoading) {
    return (
        <Card>
            <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
            <CardContent><Skeleton className="h-48 w-full" /></CardContent>
        </Card>
    )
  }

  if (!activeRegistration) {
    return (
        <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Không có đề tài hợp lệ</AlertTitle>
            <AlertDescription>
                Bạn cần phải đăng ký một đề tài và được giáo viên duyệt trong một đợt đang diễn ra để có thể nộp báo cáo tiến độ.
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Báo cáo tuần {currentWeek}</CardTitle>
            <CardDescription>Nộp báo cáo công việc đã làm và kế hoạch cho tuần tới.</CardDescription>
          </CardHeader>
          <CardContent>
            {canSubmitForCurrentWeek ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="workDone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Công việc đã làm trong tuần</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Mô tả chi tiết các công việc đã hoàn thành..." {...field} className="min-h-[120px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nextWeekPlan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kế hoạch tuần tiếp theo</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Liệt kê các mục tiêu và công việc cho tuần tới..." {...field} className="min-h-[120px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    <Send className="mr-2 h-4 w-4" />
                    {form.formState.isSubmitting ? 'Đang nộp...' : `Nộp Báo cáo Tuần ${currentWeek}`}
                  </Button>
                </form>
              </Form>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Đã nộp báo cáo cho tuần này</AlertTitle>
                <AlertDescription>
                  Bạn đã nộp báo cáo cho tuần {currentWeek}. Vui lòng quay lại vào tuần sau.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card>
            <CardHeader>
                <CardTitle>Lịch sử báo cáo</CardTitle>
                <CardDescription>Xem lại các báo cáo đã nộp và phản hồi từ giáo viên.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingReports ? (
                    <Skeleton className="h-64 w-full" />
                ) : sortedReports.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full space-y-2">
                        {sortedReports.map(report => {
                            const config = statusConfig[report.status];
                            return (
                                <AccordionItem value={`week-${report.weekNumber}`} key={report.id} className="border rounded-md px-4">
                                    <AccordionTrigger>
                                        <div className="flex items-center justify-between w-full pr-4">
                                            <div className="text-left">
                                                <p className="font-semibold">Tuần {report.weekNumber}</p>
                                                <p className="text-xs text-muted-foreground">Nộp ngày: {format(report.submissionDate.toDate(), 'dd/MM/yyyy')}</p>
                                            </div>
                                            <Badge variant={config.variant}>{config.label}</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-2">
                                        <div>
                                            <h4 className="font-semibold mb-2">Công việc đã làm</h4>
                                            <div className={cn("prose prose-sm max-w-none text-muted-foreground", "[&_ul]:list-disc [&_ul]:pl-4", "[&_ol]:list-decimal [&_ol]:pl-4")}>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.workDone}</ReactMarkdown>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-2">Kế hoạch tuần tới</h4>
                                             <div className={cn("prose prose-sm max-w-none text-muted-foreground", "[&_ul]:list-disc [&_ul]:pl-4", "[&_ol]:list-decimal [&_ol]:pl-4")}>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.nextWeekPlan}</ReactMarkdown>
                                            </div>
                                        </div>
                                        {report.supervisorComments && (
                                             <div>
                                                <h4 className="font-semibold mb-2">Nhận xét của GVHD</h4>
                                                <p className="text-sm text-muted-foreground italic">"{report.supervisorComments}"</p>
                                             </div>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                    </Accordion>
                ) : (
                    <p className="text-sm text-center text-muted-foreground py-8">Chưa có báo cáo nào được nộp.</p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

    