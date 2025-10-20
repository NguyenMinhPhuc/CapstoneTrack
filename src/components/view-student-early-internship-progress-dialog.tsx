'use client';

import { useMemo } from 'react';
import type { EarlyInternship, EarlyInternshipWeeklyReport } from '@/lib/types';
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

interface ViewStudentEarlyInternshipProgressDialogProps {
  internship: EarlyInternship;
  reports: EarlyInternshipWeeklyReport[];
  onFinished: () => void;
}

export function ViewStudentEarlyInternshipProgressDialog({ internship, reports, onFinished }: ViewStudentEarlyInternshipProgressDialogProps) {

  const sortedReports = useMemo(() => {
    if (!reports) return [];
    return [...reports].sort((a, b) => a.weekNumber - b.weekNumber);
  }, [reports]);

  const progress = useMemo(() => {
    const totalHours = reports.reduce((sum, report) => sum + report.hours, 0);
    const goalHours = 700;
    return {
      totalHours,
      goalHours,
      percentage: (totalHours / goalHours) * 100,
    };
  }, [reports]);

  return (
    <DialogContent className="sm:max-w-2xl">
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
                        {sortedReports.map(report => (
                            <AccordionItem key={report.id} value={`week-${report.weekNumber}`} className="px-4">
                                <AccordionTrigger>
                                     <div className="flex items-center justify-between w-full pr-4">
                                        <div className="text-left">
                                            <p className="font-semibold">Tuần {report.weekNumber}</p>
                                            <p className="text-xs text-muted-foreground">GVHD chấm ngày: {report.reviewDate?.toDate ? format(report.reviewDate.toDate(), 'dd/MM/yyyy') : '...'}</p>
                                        </div>
                                        <Badge>{report.hours} giờ</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <p className="text-sm text-muted-foreground italic">"{report.supervisorComments || 'Không có nhận xét.'}"</p>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
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
    </DialogContent>
  );
}
