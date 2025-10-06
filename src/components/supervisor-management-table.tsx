
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
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Search } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import type { Supervisor } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { AddSupervisorForm } from './add-supervisor-form';
import { EditSupervisorForm } from './edit-supervisor-form';

export function SupervisorManagementTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [supervisorToDelete, setSupervisorToDelete] = useState<Supervisor | null>(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const supervisorsCollectionRef = useMemoFirebase(
    () => collection(firestore, 'supervisors'),
    [firestore]
  );
  
  const { data: supervisors, isLoading } = useCollection<Supervisor>(supervisorsCollectionRef);

  const filteredSupervisors = useMemo(() => {
    if (!supervisors) return [];
    return supervisors.filter(supervisor => {
      const term = searchTerm.toLowerCase();
      const nameMatch = `${supervisor.firstName} ${supervisor.lastName}`.toLowerCase().includes(term);
      const emailMatch = supervisor.email?.toLowerCase().includes(term);
      const departmentMatch = supervisor.department?.toLowerCase().includes(term);
      
      return nameMatch || emailMatch || departmentMatch;
    });
  }, [supervisors, searchTerm]);
  
  const handleEditClick = (supervisor: Supervisor) => {
    setSelectedSupervisor(supervisor);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteClick = (supervisor: Supervisor) => {
    setSupervisorToDelete(supervisor);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!supervisorToDelete) return;
    
    try {
      const batch = writeBatch(firestore);
      batch.delete(doc(firestore, 'supervisors', supervisorToDelete.id));
      batch.delete(doc(firestore, 'users', supervisorToDelete.id)); // Also delete from users collection
      await batch.commit();

      toast({
        title: 'Thành công',
        description: `Hồ sơ giáo viên ${supervisorToDelete.firstName} ${supervisorToDelete.lastName} đã được xóa.`,
      });
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Không thể xóa hồ sơ giáo viên: ${error.message}`,
      });
    } finally {
        setIsDeleteDialogOpen(false);
        setSupervisorToDelete(null);
    }
  };

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

  return (
    <div className="space-y-4">
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative flex-1 md:grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm kiếm theo tên, email, khoa..."
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Thêm Giáo viên
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                    <DialogTitle>Thêm Giáo viên Hướng dẫn mới</DialogTitle>
                    <DialogDescription>
                        Điền thông tin chi tiết để tạo một hồ sơ giáo viên mới. Một tài khoản sẽ được tự động tạo.
                    </DialogDescription>
                    </DialogHeader>
                    <AddSupervisorForm onFinished={() => setIsAddDialogOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">STT</TableHead>
              <TableHead>Họ và Tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Khoa</TableHead>
              <TableHead>Chức vụ</TableHead>
              <TableHead className="hidden md:table-cell">Ngày tạo</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSupervisors?.map((supervisor, index) => (
              <TableRow key={supervisor.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">{`${supervisor.firstName} ${supervisor.lastName}`}</TableCell>
                <TableCell>{supervisor.email}</TableCell>
                <TableCell>{supervisor.department}</TableCell>
                <TableCell>{supervisor.facultyRank}</TableCell>
                <TableCell className="hidden md:table-cell">
                    {supervisor.createdAt?.toDate && format(supervisor.createdAt.toDate(), 'PPP')}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(supervisor)}>Sửa</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteClick(supervisor)}>Xóa</DropdownMenuItem>
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
            <DialogTitle>Chỉnh sửa thông tin Giáo viên</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin chi tiết cho giáo viên.
            </DialogDescription>
          </DialogHeader>
          {selectedSupervisor && (
            <EditSupervisorForm
              supervisor={selectedSupervisor}
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
                Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn hồ sơ và tài khoản của giáo viên này.
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
