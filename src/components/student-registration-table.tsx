
'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Upload } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { DefenseRegistration } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AddStudentRegistrationForm } from './add-student-registration-form';
import { ImportRegistrationsDialog } from './import-registrations-dialog';

interface StudentRegistrationTableProps {
  sessionId: string;
}

export function StudentRegistrationTable({ sessionId }: StudentRegistrationTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const registrationsCollectionRef = useMemoFirebase(
    () => collection(firestore, `graduationDefenseSessions/${sessionId}/registrations`),
    [firestore, sessionId]
  );

  const { data: registrations, isLoading } = useCollection<DefenseRegistration>(registrationsCollectionRef);

  const handleDelete = async (registrationId: string) => {
    const registrationDocRef = doc(firestore, `graduationDefenseSessions/${sessionId}/registrations`, registrationId);
    try {
      await deleteDoc(registrationDocRef);
      toast({
        title: 'Thành công',
        description: 'Đã xóa sinh viên khỏi đợt báo cáo.',
      });
    } catch (error) {
      console.error("Error deleting registration:", error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể xóa đăng ký của sinh viên.',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-4 w-2/4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle>Danh sách Sinh viên Đăng ký</CardTitle>
          <CardDescription>
            Quản lý danh sách sinh viên tham gia đợt báo cáo này.
          </CardDescription>
        </div>
        <div className="flex w-full sm:w-auto gap-2">
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                      <Upload className="mr-2 h-4 w-4" />
                      Nhập từ Excel
                  </Button>
              </DialogTrigger>
              <ImportRegistrationsDialog sessionId={sessionId} onFinished={() => setIsImportDialogOpen(false)} />
          </Dialog>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
                <Button className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" />
                Thêm Sinh viên
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                <DialogTitle>Thêm sinh viên vào đợt</DialogTitle>
                <DialogDescription>
                    Chọn sinh viên và điền thông tin đề tài (nếu có).
                </DialogDescription>
                </DialogHeader>
                <AddStudentRegistrationForm
                sessionId={sessionId}
                onFinished={() => setIsAddDialogOpen(false)}
                />
            </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>STT</TableHead>
              <TableHead>Tên sinh viên</TableHead>
              <TableHead>Tên đề tài</TableHead>
              <TableHead>GVHD</TableHead>
              <TableHead>Ngày đăng ký</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations && registrations.length > 0 ? (
              registrations.map((reg, index) => (
                <TableRow key={reg.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{reg.studentName}</TableCell>
                  <TableCell>{reg.projectTitle || 'Chưa có'}</TableCell>
                  <TableCell>{reg.supervisorName || 'Chưa có'}</TableCell>
                  <TableCell>
                    {reg.registrationDate?.toDate && format(reg.registrationDate.toDate(), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Sửa</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(reg.id)}>
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Chưa có sinh viên nào được thêm vào đợt này.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
