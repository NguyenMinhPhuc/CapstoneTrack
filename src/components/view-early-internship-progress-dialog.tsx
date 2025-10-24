

'use client';

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
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
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

interface ViewEarlyInternshipProgressDialogProps {
  internship: EarlyInternship;
  reports: EarlyInternshipWeeklyReport[];
  goalHours: number;
  onFinished: () => void;
  forceRefresh: () => void;
}

const statusConfig = {
  pending_review: { label: "Chờ duyệt", icon: <Clock className="h-4 w-4" />, variant: "secondary" as const },
  approved: { label: "Đã duyệt", icon: <CheckCircle className="h-4 w-4 text-green-500" />, variant: "default" as const },
  rejected: { label: "Cần sửa", icon: <XCircle className="h-4 w-4 text-red-500" />, variant: "destructive" as const },
};


export function ViewEarlyInternshipProgressDialog({ internship, reports, goalHours, onFinished, forceRefresh }: ViewEarlyInternshipProgressDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newHours, setNewHours] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newWeekNumber, setNewWeekNumber] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for editing a specific report
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState('');
  const [editingHours, setEditingHours] = useState<string>('');

  const totalApprovedHours = useMemo(() => {
    if (!reports) return 0;
    return reports
      .filter(report => report.status === 'approved')
      .reduce((sum, report) => sum + report.hours, 0);
  }, [reports]);


  const sortedReports = useMemo(() => {
    if (!reports) return [];
    return [...reports].sort((a, b) => b.weekNumber - a.weekNumber);
  }, [reports]);
  
  const availableWeeks = useMemo(() => {
    const maxWeeks = 52; // Max weeks in a year
    const submittedWeeks = new Set(sortedReports.map(r => r.weekNumber));
    return Array.from({ length: maxWeeks }, (_, i) => i + 1).filter(week => !submittedWeeks.has(week));
  }, [sortedReports]);

  const handleEditClick = (report: EarlyInternshipWeeklyReport) => {
    setEditingReportId(report.id);
    setEditingComment(report.supervisorComments || '');
    setEditingHours(String(report.hours));
  };


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
        status: 'approved' as const, // Reports created by supervisor are auto-approved
        submissionDate: serverTimestamp(), // Add submission date for consistency
        workDone: 'Báo cáo do GVHD tạo.', // Default text
        nextWeekPlan: 'Báo cáo do GVHD tạo.', // Default text
    };

    try {
        await addDoc(collection(firestore, 'earlyInternshipWeeklyReports'), newReportData);
        toast({ title: 'Thành công', description: 'Đã lưu báo cáo tuần.' });
        setNewHours('');
        setNewComment('');
        setNewWeekNumber(null);
        forceRefresh();
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
  
  const handleAction = async (reportId: string, status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !editingComment.trim()) {
      toast({
        variant: 'destructive',
        title: 'Thiếu bình luận',
        description: 'Vui lòng nhập bình luận khi yêu cầu sinh viên chỉnh sửa.',
      });
      return;
    }
     if (status === 'approved' && (editingHours === '' || isNaN(Number(editingHours)))) {
      toast({
        variant: 'destructive',
        title: 'Số giờ không hợp lệ',
        description: 'Vui lòng nhập một số hợp lệ cho giờ được duyệt.',
      });
      return;
    }
    
    const reportDocRef = doc(firestore, 'earlyInternshipWeeklyReports', reportId);
    
    try {
        await updateDoc(reportDocRef, {
            status,
            supervisorComments: editingComment,
            hours: status === 'approved' ? Number(editingHours) : 0, // Only update hours on approval
            reviewDate: new Date(),
        });
        toast({ title: 'Thành công', description: 'Đã cập nhật trạng thái báo cáo.' });
        setEditingComment('');
        setEditingHours('');
        setEditingReportId(null);
        forceRefresh();
    } catch (error: any) {
        console.error("Error updating progress report:", error);
        const contextualError = new FirestorePermissionError({
            path: reportDocRef.path,
            operation: 'update',
            requestResourceData: { status, supervisorComments: editingComment },
        });
        errorEmitter.emit('permission-error', contextualError);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Tiến độ Thực tập sớm</DialogTitle>
        <DialogDescription>
          Xem và ghi nhận tiến độ hàng tuần cho sinh viên: {internship.studentName} ({internship.studentIdentifier})
        </DialogDescription>
         <div className="text-sm font-semibold pt-2">
            Tổng giờ đã duyệt: <span className="text-primary">{totalApprovedHours.toFixed(0)}/{goalHours} giờ</span>
        </div>
      </DialogHeader>
      
      <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
             <h3 className="text-sm font-medium">Tạo Báo cáo (khi SV không nộp)</h3>
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
                <Label htmlFor="hours">Số giờ</Label>
                <Input id="hours" type="number" value={newHours} onChange={(e) => setNewHours(e.target.value)} placeholder="Ví dụ: 0 hoặc 40" />
            </div>
             <div className="space-y-2">
                <Label htmlFor="comments">Nhận xét</Label>
                <Textarea id="comments" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Nhận xét về công việc của sinh viên trong tuần..." />
            </div>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Đang lưu...' : 'Lưu báo cáo tuần'}
            </Button>
        </div>
         <div className="space-y-4">
             <h3 className="text-sm font-medium">Lịch sử Báo cáo</h3>
            <ScrollArea className="h-72 rounded-md border">
                {reports && reports.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {sortedReports.map(report => {
                            const status = report.status || 'pending_review';
                             const config = statusConfig[status];
                            return (
                            <AccordionItem key={report.id} value={`week-${report.id}`} className="px-4">
                                <AccordionTrigger onClick={() => handleEditClick(report)}>
                                     <div className="flex items-center justify-between w-full pr-4">
                                        <div className="text-left">
                                            <p className="font-semibold">Tuần {report.weekNumber}</p>
                                            <p className="text-xs text-muted-foreground">SV nộp: {report.submissionDate?.toDate ? format(report.submissionDate.toDate(), 'dd/MM/yyyy') : '...'}</p>
                                        </div>
                                         <Badge variant={config.variant}>{config.label}</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2">
                                     <Separator/>
                                     <div className="space-y-1">
                                        <p className="text-sm"><b>Công việc SV báo cáo:</b> {report.workDone}</p>
                                        <p className="text-sm"><b>Kế hoạch tuần tới của SV:</b> {report.nextWeekPlan}</p>
                                     </div>
                                     <Separator/>
                                     <div className="space-y-2">
                                        <div className="space-y-1">
                                            <Label htmlFor={`approved-hours-${report.id}`}>Số giờ được duyệt</Label>
                                            <Input
                                                id={`approved-hours-${report.id}`}
                                                type="number"
                                                value={editingReportId === report.id ? editingHours : String(report.hours)}
                                                onChange={(e) => setEditingHours(e.target.value)}
                                                placeholder="Nhập số giờ chính thức"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor={`comment-${report.id}`}>Nhận xét của bạn</Label>
                                            <Textarea 
                                                id={`comment-${report.id}`}
                                                placeholder="Nhập nhận xét (bắt buộc khi từ chối)"
                                                value={editingReportId === report.id ? editingComment : (report.supervisorComments || '')}
                                                onChange={(e) => setEditingComment(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button variant="destructive" size="sm" onClick={() => handleAction(report.id, 'rejected')}>Yêu cầu sửa</Button>
                                            <Button size="sm" onClick={() => handleAction(report.id, 'approved')}>Duyệt</Button>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )})}
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
