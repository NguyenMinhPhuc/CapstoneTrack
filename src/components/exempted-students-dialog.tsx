
'use client';

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { StudentWithRegistrationDetails } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Users, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';

interface ExemptedStudentsDialogProps {
  students: StudentWithRegistrationDetails[];
  onFinished: () => void;
}

export function ExemptedStudentsDialog({ students, onFinished }: ExemptedStudentsDialogProps) {
    
  const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    return timestamp;
  };

  return (
    <DialogContent className="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>Danh sách sinh viên được đặc cách</DialogTitle>
        <DialogDescription>
          Đây là danh sách các sinh viên đã được xét đặc cách tốt nghiệp trong đợt này.
        </DialogDescription>
      </DialogHeader>

      <div className="py-4">
        {students.length > 0 ? (
          <ScrollArea className="h-72 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>STT</TableHead>
                  <TableHead>MSSV</TableHead>
                  <TableHead>Họ và Tên</TableHead>
                  <TableHead>Số quyết định</TableHead>
                  <TableHead>Ngày quyết định</TableHead>
                  <TableHead>Minh chứng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{student.studentId}</TableCell>
                    <TableCell>{student.studentName}</TableCell>
                    <TableCell>{student.exemptionDecisionNumber || 'N/A'}</TableCell>
                    <TableCell>
                        {toDate(student.exemptionDecisionDate) 
                          ? format(toDate(student.exemptionDecisionDate)!, 'PPP') 
                          : 'N/A'
                        }
                    </TableCell>
                    <TableCell>
                      {student.exemptionProofLink ? (
                        <a href={student.exemptionProofLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          <LinkIcon className="h-3 w-3"/>
                          Xem
                        </a>
                      ) : (
                        'Không có'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertTitle>Không có dữ liệu</AlertTitle>
            <AlertDescription>
              Hiện không có sinh viên nào ở trạng thái "Đặc cách".
            </AlertDescription>
          </Alert>
        )}
      </div>

      <DialogFooter>
        <Button onClick={onFinished}>
          Đóng
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
