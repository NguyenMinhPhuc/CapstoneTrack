
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
import { Users } from 'lucide-react';

interface WithdrawnStudentsDialogProps {
  students: StudentWithRegistrationDetails[];
  onFinished: () => void;
}

export function WithdrawnStudentsDialog({ students, onFinished }: WithdrawnStudentsDialogProps) {
  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Danh sách sinh viên bỏ báo cáo</DialogTitle>
        <DialogDescription>
          Đây là danh sách các sinh viên đã được cập nhật trạng thái "Bỏ báo cáo" trong đợt này.
        </DialogDescription>
      </DialogHeader>

      <div className="py-4">
        {students.length > 0 ? (
          <ScrollArea className="h-72 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MSSV</TableHead>
                  <TableHead>Họ và Tên</TableHead>
                  <TableHead>Lớp</TableHead>
                  <TableHead>Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(student => (
                  <TableRow key={student.id}>
                    <TableCell>{student.studentId}</TableCell>
                    <TableCell>{student.studentName}</TableCell>
                    <TableCell>{student.className || 'N/A'}</TableCell>
                    <TableCell>{student.graduationStatusNote || student.internshipStatusNote || 'Không có'}</TableCell>
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
              Hiện không có sinh viên nào ở trạng thái "Bỏ báo cáo".
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
