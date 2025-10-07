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
import type { Student } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Users } from 'lucide-react';

interface StudentStatusDetailsDialogProps {
  title: string;
  students: Student[];
  onFinished: () => void;
}

export function StudentStatusDetailsDialog({ title, students, onFinished }: StudentStatusDetailsDialogProps) {
  return (
    <DialogContent className="sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Đây là danh sách chi tiết các sinh viên thuộc trạng thái này.
        </DialogDescription>
      </DialogHeader>

      <div className="py-4">
        {students.length > 0 ? (
          <ScrollArea className="h-80 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>STT</TableHead>
                  <TableHead>MSSV</TableHead>
                  <TableHead>Họ và Tên</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{student.studentId}</TableCell>
                    <TableCell>{student.firstName} {student.lastName}</TableCell>
                    <TableCell>{student.phone || 'Chưa có'}</TableCell>
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
              Không có sinh viên nào trong danh sách này.
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
