
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
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Search, Upload, ListFilter, Trash2, Users } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import type { Student } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { AddStudentForm } from './add-student-form';
import { EditStudentForm } from './edit-student-form';
import { ImportStudentsDialog } from './import-students-dialog';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { AssignClassDialog } from './assign-class-dialog';


const statusLabel: Record<Student['status'], string> = {
  studying: 'Đang học',
  reserved: 'Bảo lưu',
  dropped_out: 'Đã nghỉ',
};

const statusVariant: Record<Student['status'], 'default' | 'secondary' | 'destructive'> = {
    studying: 'default',
    reserved: 'secondary',
    dropped_out: 'destructive',
};

const statusColorClass: Record<Student['status'], string> = {
  studying: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
  reserved: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700',
  dropped_out: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
};


export function StudentManagementTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignClassDialogOpen, setIsAssignClassDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);


  const studentsCollectionRef = useMemoFirebase(
    () => collection(firestore, 'students'),
    [firestore]
  );
  
  const { data: students, isLoading } = useCollection<Student>(studentsCollectionRef);

  const uniqueClasses = useMemo(() => {
    if (!students) return [];
    const classSet = new Set<string>();
    students.forEach(student => {
        if (student.className) {
            classSet.add(student.className);
        }
    });
    return Array.from(classSet).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter(student => {
      const term = searchTerm.toLowerCase();
      const nameMatch = `${student.firstName} ${student.lastName}`.toLowerCase().includes(term);
      const idMatch = student.studentId?.toLowerCase().includes(term);
      const emailMatch = student.email?.toLowerCase().includes(term);
      
      const classMatch = classFilter === 'all' || student.className === classFilter;

      return (nameMatch || idMatch || emailMatch) && classMatch;
    });
  }, [students, searchTerm, classFilter]);
  
  const handleEditClick = (student: Student) => {
    setSelectedStudent(student);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteDialogOpen(true);
  };

  const handleStatusChange = async (studentId: string, newStatus: Student['status']) => {
    const studentDocRef = doc(firestore, 'students', studentId);
    try {
      await updateDoc(studentDocRef, { status: newStatus });
      toast({
        title: 'Thành công',
        description: `Trạng thái sinh viên đã được cập nhật.`,
      });
    } catch (error) {
      console.error("Error updating student status:", error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái sinh viên.',
      });
    }
  };

  const confirmDelete = async () => {
    if (selectedRowIds.length > 0) {
        // Batch delete
        const batch = writeBatch(firestore);
        selectedRowIds.forEach(id => {
            batch.delete(doc(firestore, 'students', id));
            batch.delete(doc(firestore, 'users', id)); // Also delete from users collection
        });
        try {
            await batch.commit();
            toast({
                title: 'Thành công',
                description: `${selectedRowIds.length} sinh viên đã được xóa.`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: `Không thể xóa sinh viên: ${error.message}`,
            });
        } finally {
            setSelectedRowIds([]);
            setIsDeleteDialogOpen(false);
        }
    } else if (studentToDelete) {
        // Single delete
        try {
            const batch = writeBatch(firestore);
            batch.delete(doc(firestore, 'students', studentToDelete.id));
            batch.delete(doc(firestore, 'users', studentToDelete.id)); // Also delete from users collection
            await batch.commit();
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
    }
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
        if (checked === true) {
            setSelectedRowIds(filteredStudents?.map(s => s.id) || []);
        } else {
            setSelectedRowIds([]);
        }
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    if (checked) {
        setSelectedRowIds(prev => [...prev, id]);
    } else {
        setSelectedRowIds(prev => prev.filter(rowId => rowId !== id));
    }
  };

  const handleAssignClassFinished = () => {
    setIsAssignClassDialogOpen(false);
    setSelectedRowIds([]);
  }

  if (isLoading) {
    return (
      <Card>
          <CardHeader>
              <Skeleton className="h-8 w-1/4" />
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

  const isAllSelected = filteredStudents && selectedRowIds.length === filteredStudents.length;
  const isSomeSelected = selectedRowIds.length > 0 && selectedRowIds.length < (filteredStudents?.length ?? 0);

  return (
    <div className="space-y-4">
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                 {selectedRowIds.length > 0 && (
                    <>
                        <Button variant="outline" size="sm" onClick={() => setIsAssignClassDialogOpen(true)}>
                            <Users className="mr-2 h-4 w-4" />
                            Xếp lớp ({selectedRowIds.length})
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa ({selectedRowIds.length})
                        </Button>
                    </>
                )}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <div className="flex w-full sm:w-auto gap-2">
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
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1 text-sm">
                                <ListFilter className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only">Lọc theo lớp</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                             <DropdownMenuLabel>Lọc theo lớp</DropdownMenuLabel>
                             <DropdownMenuSeparator />
                             <DropdownMenuCheckboxItem
                                checked={classFilter === 'all'}
                                onCheckedChange={() => setClassFilter('all')}
                            >
                                Tất cả các lớp
                            </DropdownMenuCheckboxItem>
                            {uniqueClasses.map(className => (
                                <DropdownMenuCheckboxItem
                                    key={className}
                                    checked={classFilter === className}
                                    onCheckedChange={() => setClassFilter(className)}
                                >
                                    {className}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
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
              <TableHead className="w-[50px]">
                <Checkbox
                    checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                    onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Họ và Tên</TableHead>
              <TableHead>MSSV</TableHead>
              <TableHead>Lớp</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Ngày tạo</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents?.map((student) => (
              <TableRow key={student.id} data-state={selectedRowIds.includes(student.id) && "selected"}>
                <TableCell>
                     <Checkbox
                        checked={selectedRowIds.includes(student.id)}
                        onCheckedChange={(checked) => handleRowSelect(student.id, !!checked)}
                     />
                </TableCell>
                <TableCell className="font-medium">{`${student.firstName} ${student.lastName}`}</TableCell>
                <TableCell>{student.studentId}</TableCell>
                <TableCell>{student.className || <span className="text-muted-foreground">Chưa có</span>}</TableCell>
                <TableCell>
                    <Badge className={cn(statusColorClass[student.status])}>
                        {statusLabel[student.status]}
                    </Badge>
                </TableCell>
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
                       <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <span>Thay đổi trạng thái</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                             <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'studying')} disabled={student.status === 'studying'}>
                              {statusLabel.studying}
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'reserved')} disabled={student.status === 'reserved'}>
                              {statusLabel.reserved}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'dropped_out')} disabled={student.status === 'dropped_out'}>
                              {statusLabel.dropped_out}
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
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
    
    {isAssignClassDialogOpen && (
        <AssignClassDialog
            isOpen={isAssignClassDialogOpen}
            onOpenChange={setIsAssignClassDialogOpen}
            studentIds={selectedRowIds}
            allStudents={students || []}
            onFinished={handleAssignClassFinished}
        />
    )}

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
                Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn hồ sơ và tài khoản của {studentToDelete ? `sinh viên ${studentToDelete.firstName} ${studentToDelete.lastName}` : `${selectedRowIds.length} sinh viên đã chọn`}.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStudentToDelete(null)}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Tiếp tục</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
