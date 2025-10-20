
'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, query, where, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { EarlyInternship, EarlyInternshipWeeklyReport } from '@/lib/types';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { format } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface ViewEarlyInternshipProgressDialogProps {
  internship: EarlyInternship;
  onFinished: () => void;
}

export function ViewEarlyInternshipProgressDialog({ internship, onFinished }: ViewEarlyInternshipProgressDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newHours, setNewHours] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newWeekNumber, setNewWeekNumber] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportsQuery = useMemoFirebase(
    () => query(collection(firestore, 'earlyInternshipWeeklyReports'), where('earlyInternshipId', '==', internship.id)),
    [firestore, internship]
  );
  const { data: reports, isLoading } = useCollection<EarlyInternshipWeeklyReport>(reportsQuery);

  const sortedReports = useMemo(() => {
    if (!reports) return [];
    return [...reports].sort((a, b) => b.weekNumber - a.weekNumber);
  }, [reports]);
  
  const availableWeeks = useMemo(() => {
    const maxWeeks = 52; // Max weeks in a year
    const submittedWeeks = new Set(sortedReports.map(r => r.weekNumber));
    return Array.from({ length: maxWeeks }, (_, i) => i + 1).filter(week => !submittedWeeks.has(week));
  }, [sortedReports]);

  const handleSubmit = async () => {
    if (newWeekNumber === null || !newHours) {
        toast({ variant: 'destructive', title: 'Thiếu thông tin', description: 'Vui lòng chọn tuần và nhập số giờ.' });
        return;
    }
    setIsSubmitting(true);
    
    const newReportData = {
        earlyInternshipId: internship.id,
        studentId: internship.studentId,
        supervisorId: internship.supervisorId,
        weekNumber: newWeekNumber,
        hours: Number(newHours),
        supervisorComments: newComment,
        reviewDate: serverTimestamp(),
    };

    try {
        await addDoc(collection(firestore, 'earlyInternshipWeeklyReports'), newReportData);
        toast({ title: 'Thành công', description: 'Đã lưu báo cáo tuần.' });
        setNewHours('');
        setNewComment('');
        setNewWeekNumber(null);
    } catch(error) {
        console.error("Error adding weekly report: ", error);
        const contextualError = new FirestorePermissionError({
            path: 'earlyInternshipWeeklyReports',
            operation: 'create',
            requestResourceData: newReportData,
        });
        errorEmitter.emit('permission-error', contextualError);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Tiến độ Thực tập sớm</DialogTitle>
        <DialogDescription>
          Xem và ghi nhận tiến độ hàng tuần cho sinh viên: {internship.studentName} ({internship.studentIdentifier})
        </DialogDescription>
      </DialogHeader>
      
      <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
             <h3 className="text-sm font-medium">Ghi nhận Tuần mới</h3>
            <div className="space-y-2">
                <Label htmlFor="week-number">Tuần số</Label>
                <Select value={newWeekNumber?.toString() || ''} onValueChange={(value) => setNewWeekNumber(Number(value))}>
                    <SelectTrigger id="week-number">
                        <SelectValue placeholder="Chọn một tuần" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableWeeks.map(week => (
                             <SelectItem key={week} value={String(week)}>Tuần {week}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="hours">Số giờ hoàn thành</Label>
                <Input id="hours" type="number" value={newHours} onChange={(e) => setNewHours(e.target.value)} placeholder="Ví dụ: 40" />
            </div>
             <div className="space-y-2">
                <Label htmlFor="comments">Nhận xét (tùy chọn)</Label>
                <Textarea id="comments" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Nhận xét về công việc của sinh viên trong tuần..." />
            </div>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Đang lưu...' : 'Lưu báo cáo tuần'}
            </Button>
        </div>
         <div className="space-y-4">
             <h3 className="text-sm font-medium">Lịch sử Báo cáo</h3>
            <ScrollArea className="h-72 rounded-md border">
                {isLoading ? (
                    <p className="p-4 text-center">Đang tải lịch sử...</p>
                ) : sortedReports.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {sortedReports.map(report => (
                            <AccordionItem key={report.id} value={`week-${report.weekNumber}`} className="px-4">
                                <AccordionTrigger>
                                     <div className="flex items-center justify-between w-full pr-4">
                                        <div className="text-left">
                                            <p className="font-semibold">Tuần {report.weekNumber}</p>
                                            <p className="text-xs text-muted-foreground">Chấm ngày: {report.reviewDate?.toDate ? format(report.reviewDate.toDate(), 'dd/MM/yyyy') : '...'}</p>
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
                        <p className="text-sm text-muted-foreground p-4">Chưa có báo cáo nào.</p>
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
