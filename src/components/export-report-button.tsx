'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { FileDown, UploadCloud } from 'lucide-react';
import type {
  GraduationDefenseSession,
  DefenseCouncilMember,
  DefenseSubCommittee,
  DefenseRegistration,
} from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ExportReportButtonProps {
  sessionId: string;
  session: GraduationDefenseSession;
}

export function ExportReportButton({ sessionId, session }: ExportReportButtonProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [template, setTemplate] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch all necessary data
  const councilRef = useMemoFirebase(
    () => collection(firestore, `graduationDefenseSessions/${sessionId}/council`),
    [firestore, sessionId]
  );
  const { data: councilMembers } = useCollection<DefenseCouncilMember>(councilRef);

  const subCommitteesRef = useMemoFirebase(
    () => collection(firestore, `graduationDefenseSessions/${sessionId}/subCommittees`),
    [firestore, sessionId]
  );
  const { data: subCommittees } = useCollection<DefenseSubCommittee>(subCommitteesRef);

  const registrationsRef = useMemoFirebase(
    () => query(collection(firestore, 'defenseRegistrations'), where('sessionId', '==', sessionId)),
    [firestore, sessionId]
  );
  const { data: registrations } = useCollection<DefenseRegistration>(registrationsRef);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setTemplate(event.target.files[0]);
    }
  };

  const generateReport = () => {
    if (!template) {
      toast({
        variant: 'destructive',
        title: 'Chưa có file mẫu',
        description: 'Vui lòng chọn một file .docx mẫu để tiếp tục.',
      });
      return;
    }
    if (!councilMembers || !subCommittees || !registrations) {
      toast({
        variant: 'destructive',
        title: 'Dữ liệu chưa sẵn sàng',
        description: 'Không thể tải đủ thông tin để tạo báo cáo. Vui lòng thử lại.',
      });
      return;
    }

    setIsGenerating(true);

    const reader = new FileReader();
    reader.readAsBinaryString(template);
    reader.onload = () => {
      try {
        const zip = new PizZip(reader.result);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });
        
        const toDate = (timestamp: any): Date | undefined => {
            if (!timestamp) return undefined;
            if (timestamp && typeof timestamp.toDate === 'function') {
                return timestamp.toDate();
            }
            return timestamp;
        };

        const studentsBySubCommittee = subCommittees.map(sc => {
            let studentCounter = 0;
            const students = registrations
                .filter(reg => reg.subCommitteeId === sc.id && reg.registrationStatus === 'reporting')
                .map(reg => ({
                    ...reg,
                    stt: ++studentCounter
                }));
            return {
                ...sc,
                students
            }
        });

        const dataForTemplate = {
          session_name: session.name,
          start_date: toDate(session.startDate) ? format(toDate(session.startDate)!, 'dd/MM/yyyy') : '',
          report_date: toDate(session.expectedReportDate) ? format(toDate(session.expectedReportDate)!, 'dd/MM/yyyy') : '',
          council: councilMembers,
          subcommittees: studentsBySubCommittee,
        };

        doc.setData(dataForTemplate);
        doc.render();

        const out = doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        
        saveAs(out, `BaoCao_${session.name.replace(/\s+/g, '_')}.docx`);
        toast({
          title: 'Thành công',
          description: 'Báo cáo đã được tạo và đang được tải xuống.',
        });
        setIsDialogOpen(false); // Close dialog on success
      } catch (error: any) {
        console.error('Error generating document:', error);
        toast({
          variant: 'destructive',
          title: 'Lỗi tạo file',
          description: error.message,
        });
      } finally {
        setIsGenerating(false);
      }
    };
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          Xuất Báo cáo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xuất Báo cáo theo mẫu</DialogTitle>
          <DialogDescription>
            Tải lên file mẫu (.docx) của bạn. Hệ thống sẽ điền thông tin từ đợt báo cáo này vào file mẫu đó.
            Hãy chắc chắn file mẫu của bạn có chứa các thẻ (placeholder) đúng định dạng.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="template-file">File mẫu (.docx)</Label>
                <div className="relative">
                    <Input id="template-file" type="file" accept=".docx" onChange={handleFileChange} className="pl-12"/>
                     <UploadCloud className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
                {template && <p className="text-sm text-muted-foreground">Đã chọn: {template.name}</p>}
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
          <Button onClick={generateReport} disabled={!template || isGenerating}>
            {isGenerating ? 'Đang tạo...' : 'Tạo và Tải xuống'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
