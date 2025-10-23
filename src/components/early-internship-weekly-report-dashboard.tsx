
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
import { Info, Send, Clock, CheckCircle, XCircle, Link } from 'lucide-react';
import { type EarlyInternship, type EarlyInternshipWeeklyReport } from '@/lib/types';
import type { User } from 'firebase/auth';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from './ui/input';

const formSchema = z.object({
  hours: z.coerce.number().min(1, { message: 'Vui lòng nhập số giờ.' }).max(100, 'Số giờ không hợp lệ.'),
  supervisorComments: z.string().optional(), // This field is for supervisor, student won't fill it
});

const statusConfig = {
  pending_review: { label: "Chờ duyệt", icon: <Clock className="h-4 w-4" />, variant: "secondary" as const },
  approved: { label: "Đã duyệt", icon: <CheckCircle className="h-4 w-4 text-green-500" />, variant: "default" as const },
  rejected: { label: "Cần sửa", icon: <XCircle className="h-4 w-4 text-red-500" />, variant: "destructive" as const },
};


export function EarlyInternshipWeeklyReportDashboard({ user }: { user: User }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeInternship, setActiveInternship] = useState<EarlyInternship | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const reportsQuery = useMemoFirebase(
    () => activeInternship ? query(collection(firestore, 'earlyInternshipWeeklyReports'), where('earlyInternshipId', '==', activeInternship.id)) : null,
    [firestore, activeInternship]
  );
  const { data: pastReports, isLoading: isLoadingReports } = useCollection<EarlyInternshipWeeklyReport>(reportsQuery);

  const sortedReports = useMemo(() => {
    if (!pastReports) return [];
    return [...pastReports].sort((a, b) => b.weekNumber - a.weekNumber);
  }, [pastReports]);

  const availableWeeksForSubmission = useMemo(() => {
    const totalWeeks = 52; // Max weeks in a year
    const submittedWeeks = new Set(pastReports?.map(r => r.weekNumber) || []);
    const weeks = [];
    for (let i = 1; i <= totalWeeks; i++) {
        if (!submittedWeeks.has(i)) {
            weeks.push(i);
        }
    }
    return weeks;
  }, [pastReports]);

  useEffect(() => {
      if (availableWeeksForSubmission.length > 0 && selectedWeek === null) {
          setSelectedWeek(availableWeeksForSubmission[0]);
      }
      if (availableWeeksForSubmission.length === 0) {
          setSelectedWeek(null);
      }
  }, [availableWeeksForSubmission, selectedWeek])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hours: 40,
      supervisorComments: '',
    },
  });

  useEffect(() => {
    if (!user || !firestore) return;

    const findActiveInternship = async () => {
      setIsLoading(true);
      try {
        const internshipQuery = query(
            collection(firestore, 'earlyInternships'),
            where('studentId', '==', user.uid),
            where('status', '==', 'ongoing')
        );
        const internshipSnapshot = await getDocs(internshipQuery);

        if (!internshipSnapshot.empty) {
          const internshipData = { id: internshipSnapshot.docs[0].id, ...internshipSnapshot.docs[0].data() } as EarlyInternship;
          setActiveInternship(internshipData);
        }

      } catch (error) {
        console.error("Error finding active early internship:", error);
      } finally {
        setIsLoading(false);
      }
    };

    findActiveInternship();
  }, [user, firestore]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!activeInternship || selectedWeek === null) return;

    const reportData = {
        hours: values.hours,
        supervisorComments: values.supervisorComments || '',
        earlyInternshipId: activeInternship.id,
        studentId: user.uid,
        supervisorId: activeInternship.supervisorId || '',
        weekNumber: selectedWeek,
        reviewDate: serverTimestamp(),
        status: 'pending_review' as const, // Ensure default status is set
    };
    
    addDoc(collection(firestore, 'earlyInternshipWeeklyReports'), reportData)
        .then(() => {
            toast({ title: "Thành công", description: `Đã nộp báo cáo cho tuần ${selectedWeek}.` });
            form.reset();
            setSelectedWeek(null);
        })
        .catch(error => {
            const contextualError = new FirestorePermissionError({
                path: 'earlyInternshipWeeklyReports',
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

  if (!activeInternship) {
    return (
        <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Không có đợt thực tập sớm</AlertTitle>
            <AlertDescription>
                Bạn hiện không ở trong một đợt thực tập sớm nào đang diễn ra.
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Ghi nhận Giờ Thực tập</CardTitle>
            <CardDescription>Chọn tuần và điền thông tin công việc đã làm để GVHD ghi nhận.</CardDescription>
          </CardHeader>
          <CardContent>
            {availableWeeksForSubmission.length > 0 ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormItem>
                    <FormLabel>Chọn tuần báo cáo</FormLabel>
                    <Select onValueChange={(value) => setSelectedWeek(Number(value))} value={selectedWeek?.toString()}>
                       <SelectTrigger>
                          <SelectValue placeholder="Chọn một tuần để nộp" />
                        </SelectTrigger>
                      <SelectContent>
                        {availableWeeksForSubmission.map(week => (
                            <SelectItem key={week} value={week.toString()}>Tuần {week}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                  <FormField
                    control={form.control}
                    name="hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Số giờ làm việc trong tuần</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="40" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supervisorComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ghi chú công việc (tùy chọn)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Mô tả ngắn gọn công việc đã làm..." {...field} className="min-h-[120px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || selectedWeek === null}>
                    <Send className="mr-2 h-4 w-4" />
                    {form.formState.isSubmitting ? 'Đang gửi...' : `Gửi Báo cáo Tuần ${selectedWeek || ''}`}
                  </Button>
                </form>
              </Form>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Đã hoàn thành báo cáo</AlertTitle>
                <AlertDescription>
                  Bạn đã nộp báo cáo cho tất cả các tuần.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card>
            <CardHeader>
                <CardTitle>Lịch sử ghi nhận</CardTitle>
                <CardDescription>Xem lại các báo cáo đã nộp và số giờ được ghi nhận từ giáo viên.</CardDescription>
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
                                                <p className="text-xs text-muted-foreground">GVHD chấm ngày: {report.reviewDate?.toDate ? format(report.reviewDate.toDate(), 'dd/MM/yyyy') : 'Đang cập nhật...'}</p>
                                            </div>
                                            <Badge>{report.hours} giờ</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-2">
                                        <div>
                                            <h4 className="font-semibold mb-2">Nhận xét của GVHD</h4>
                                            <p className="text-sm text-muted-foreground italic">"{report.supervisorComments || 'Không có nhận xét.'}"</p>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                    </Accordion>
                ) : (
                    <p className="text-sm text-center text-muted-foreground py-8">Chưa có báo cáo nào được ghi nhận.</p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
