
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Search, Upload } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { Student } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { AddStudentForm } from './add-student-form';
import { EditStudentForm } from './edit-student-form';
import { ImportStudentsDialog } from './import-students-dialog';

export function StudentManagementTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const studentsCollectionRef = useMemoFirebase(
    () => collection(firestore, 'students'),
    [firestore]
  );
  
  const { data: students, isLoading } = useCollection<Student>(studentsCollectionRef);

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter(student => {
      const term = searchTerm.toLowerCase();
      const nameMatch = `${student.firstName} ${student.lastName}`.toLowerCase().includes(term);
      const idMatch = student.studentId?.toLowerCase().includes(term);
      const emailMatch = student.email?.toLowerCase().includes(term);
      return nameMatch || idMatch || emailMatch;
    });
  }, [students, searchTerm]);
  
  const handleEditClick = (student: Student) => {
    setSelectedStudent(student);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;

    // Note: This only deletes the 'student' profile doc.
    // It does NOT delete the associated Firebase Auth user account.
    // A more robust solution would involve a Cloud Function to handle this.
    try {
      await deleteDoc(doc(firestore, 'students', studentToDelete.id));
      toast({
        title: 'Thành công',
        description: `Hồ sơ sinh viên ${studentToDelete.firstName} ${studentToDelete.lastName} đã được xóa.`,
      });
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Không thể xóa hồ sơ sinh viên: ${error.message}`,
      });
    } finally {
        setIsDeleteDialogOpen(false);
        setStudentToDelete(null);
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
                  {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                          <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-full" />
                          </div>
                      </div>
                  ))}
              </div>
          </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>Danh sách Sinh viên</CardTitle>
                <CardDescription>
                  Quản lý thông tin tất cả sinh viên trong hệ thống.
                </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Tìm kiếm theo tên, MSSV, email..."
                        className="pl-8 w-full sm:w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">
                                <Upload className="mr-2 h-4 w-4" />
                                Nhập từ Excel
                            </Button>
                        </DialogTrigger>
                        <ImportStudentsDialog onFinished={() => setIsImportDialogOpen(false)} />
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
                            <DialogTitle>Thêm Sinh viên mới</DialogTitle>
                            <DialogDescription>
                                Điền thông tin chi tiết để tạo một hồ sơ sinh viên mới. Một tài khoản sẽ được tự động tạo.
                            </DialogDescription>
                            </DialogHeader>
                            <AddStudentForm onFinished={() => setIsAddDialogOpen(false)} />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ và Tên</TableHead>
              <TableHead>MSSV</TableHead>
              <TableHead>Lớp</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Ngày tạo</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents?.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{`${student.firstName} ${student.lastName}`}</TableCell>
                <TableCell>{student.studentId}</TableCell>
                <TableCell>{student.className}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell className="hidden md:table-cell">
                    {student.createdAt?.toDate && format(student.createdAt.toDate(), 'PPP')}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(student)}>Sửa</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteClick(student)}>Xóa</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin Sinh viên</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin chi tiết cho sinh viên.
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <EditStudentForm
              student={selectedStudent}
              onFinished={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
                Hành động này không thể được hoàn tác. Thao tác này sẽ xóa hồ sơ sinh viên. Lưu ý: tài khoản đăng nhập của sinh viên sẽ không bị xóa.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Tiếp tục</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
