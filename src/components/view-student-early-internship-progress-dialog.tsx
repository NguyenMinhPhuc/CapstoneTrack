'use client';

import { useMemo } from 'react';
import type { EarlyInternship, EarlyInternshipWeeklyReport, SystemSettings } from '@/lib/types';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { format } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface ViewStudentEarlyInternshipProgressDialogProps {
  internship: EarlyInternship;
  reports: EarlyInternshipWeeklyReport[];
  onFinished: () => void;
}

const statusConfig = {
  pending_review: { label: "Chờ duyệt", icon: <Clock className="h-4 w-4" />, variant: "secondary" as const },
  approved: { label: "Đã duyệt", icon: <CheckCircle className="h-4 w-4 text-green-500" />, variant: "default" as const },
  rejected: { label: "Cần sửa", icon: <XCircle className="h-4 w-4 text-red-500" />, variant: "destructive" as const },
};


export function ViewStudentEarlyInternshipProgressDialog({ internship, reports, onFinished }: ViewStudentEarlyInternshipProgressDialogProps) {
  const firestore = useFirestore();
  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'systemSettings', 'features'), [firestore]);
  const { data: settings } = useDoc<SystemSettings>(settingsDocRef);
  const goalHours = settings?.earlyInternshipGoalHours ?? 700;

  const sortedReports = useMemo(() => {
    if (!reports) return [];
    return [...reports].sort((a, b) => a.weekNumber - b.weekNumber);
  }, [reports]);

  const progress = useMemo(() => {
    // Only sum hours from 'approved' reports
    const totalHours = reports
      .filter(report => report.status === 'approved')
      .reduce((sum, report) => sum + report.hours, 0);
      
    return {
      totalHours,
      goalHours,
      percentage: goalHours > 0 ? (totalHours / goalHours) * 100 : 0,
    };
  }, [reports, goalHours]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Chi tiết Tiến độ Thực tập sớm</DialogTitle>
        <DialogDescription>
          Theo dõi số giờ đã tích lũy và xem nhận xét từ giáo viên hướng dẫn.
        </DialogDescription>
      </DialogHeader>
      
      <div className="py-4 space-y-4">
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <p className="font-medium">Tổng số giờ đã tích lũy</p>
                <p className="text-sm text-muted-foreground">{progress.totalHours.toFixed(0)}/{progress.goalHours} giờ</p>
            </div>
            <Progress value={progress.percentage} />
        </div>
         <div className="space-y-2">
             <h3 className="text-sm font-medium">Lịch sử Ghi nhận</h3>
            <ScrollArea className="h-72 rounded-md border">
                {sortedReports.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {sortedReports.map(report => {
                            const status = report.status || 'pending_review';
                            const config = statusConfig[status];
                            return (
                            <AccordionItem key={report.id} value={`week-${report.weekNumber}`} className="px-4">
                                <AccordionTrigger>
                                     <div className="flex items-center justify-between w-full pr-4">
                                        <div className="text-left">
                                            <p className="font-semibold">Tuần {report.weekNumber}</p>
                                            <p className="text-xs text-muted-foreground">GVHD chấm ngày: {report.reviewDate?.toDate ? format(report.reviewDate.toDate(), 'dd/MM/yyyy') : '...'}</p>
                                        </div>
                                         <Badge variant={config.variant}>{config.label}</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-2">
                                    <p className="text-sm"><b>Số giờ đã báo cáo:</b> {report.hours}</p>
                                    <p className="text-sm text-muted-foreground italic">"{report.supervisorComments || 'Chưa có nhận xét.'}"</p>
                                </AccordionContent>
                            </AccordionItem>
                        )})}
                    </Accordion>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-muted-foreground p-4">Chưa có báo cáo nào được ghi nhận.</p>
                    </div>
                )}
            </ScrollArea>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onFinished}>
          Đóng
        </Button>
      </DialogFooter>
    </>
  );
}
