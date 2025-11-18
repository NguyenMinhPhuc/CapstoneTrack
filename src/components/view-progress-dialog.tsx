
'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, query, where, updateDoc } from 'firebase/firestore';
import type { DefenseRegistration, WeeklyProgressReport } from '@/lib/types';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import { Clock, CheckCircle, XCircle, Link } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from './ui/textarea';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';

interface ViewProgressDialogProps {
  registration: DefenseRegistration;
  onFinished: () => void;
}

const statusConfig = {
  pending_review: { label: "Chờ duyệt", icon: <Clock className="h-4 w-4" />, variant: "secondary" as const },
  approved: { label: "Đã duyệt", icon: <CheckCircle className="h-4 w-4 text-green-500" />, variant: "default" as const },
  rejected: { label: "Cần sửa", icon: <XCircle className="h-4 w-4 text-red-500" />, variant: "destructive" as const },
};

export function ViewProgressDialog({ registration, onFinished }: ViewProgressDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [comment, setComment] = useState('');

  const reportsQuery = useMemoFirebase(
    () => query(collection(firestore, 'weeklyProgressReports'), where('registrationId', '==', registration.id)),
    [firestore, registration]
  );
  const { data: reports, isLoading } = useCollection<WeeklyProgressReport>(reportsQuery);

  const sortedReports = useMemo(() => {
    if (!reports) return [];
    return [...reports].sort((a, b) => b.weekNumber - a.weekNumber);
  }, [reports]);

  const handleAction = async (reportId: string, status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !comment.trim()) {
      toast({
        variant: 'destructive',
        title: 'Thiếu bình luận',
        description: 'Vui lòng nhập bình luận khi yêu cầu sinh viên chỉnh sửa.',
      });
      return;
    }
    
    const reportDocRef = doc(firestore, 'weeklyProgressReports', reportId);
    
    try {
        await updateDoc(reportDocRef, {
            status,
            supervisorComments: comment,
            reviewDate: new Date(),
        });
        toast({ title: 'Thành công', description: 'Đã cập nhật trạng thái báo cáo.' });
        setComment(''); // Clear comment after submission
    } catch (error: any) {
        console.error("Error updating progress report:", error);
        const contextualError = new FirestorePermissionError({
            path: reportDocRef.path,
            operation: 'update',
            requestResourceData: { status, supervisorComments: comment },
        });
        errorEmitter.emit('permission-error', contextualError);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Lịch sử báo cáo tiến độ</DialogTitle>
        <DialogDescription>
          Xem và duyệt báo cáo của sinh viên: {registration.studentName} ({registration.studentId})
        </DialogDescription>
      </DialogHeader>
      
      <ScrollArea className="h-[60vh] -mx-6 px-6">
        <div className="py-4 space-y-4">
            {isLoading ? (
                <p>Đang tải báo cáo...</p>
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
                                            <p className="text-xs text-muted-foreground">Nộp ngày: {report.submissionDate?.toDate ? format(report.submissionDate.toDate(), 'dd/MM/yyyy') : '...'}</p>
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
                                    {report.proofLink && (
                                        <div>
                                            <h4 className="font-semibold mb-2">Minh chứng</h4>
                                            <a href={report.proofLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline break-all flex items-center gap-1">
                                                <Link className="h-3 w-3" /> {report.proofLink}
                                            </a>
                                        </div>
                                    )}
                                     {report.status === 'pending_review' ? (
                                        <div className="space-y-2">
                                            <Textarea 
                                                placeholder="Nhập nhận xét của bạn (bắt buộc khi yêu cầu sửa)..."
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                            />
                                            <div className="flex justify-end gap-2">
                                                <Button variant="destructive" size="sm" onClick={() => handleAction(report.id, 'rejected')}>Yêu cầu sửa</Button>
                                                <Button size="sm" onClick={() => handleAction(report.id, 'approved')}>Duyệt</Button>
                                            </div>
                                        </div>
                                     ) : (
                                         <div>
                                            <h4 className="font-semibold mb-2">Nhận xét của GVHD</h4>
                                            <p className="text-sm text-muted-foreground italic">"{report.supervisorComments || 'Không có nhận xét.'}"</p>
                                         </div>
                                     )}
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                 </Accordion>
            ) : (
                <Alert>
                    <AlertTitle>Chưa có báo cáo</AlertTitle>
                    <AlertDescription>Sinh viên này chưa nộp báo cáo tiến độ nào.</AlertDescription>
                </Alert>
            )}
        </div>
      </ScrollArea>
      <DialogFooter>
        <Button variant="outline" onClick={onFinished}>
          Đóng
        </Button>
      </DialogFooter>
    </>
  );
}
