
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
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Search, ListFilter, Briefcase, GraduationCap } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, updateDoc } from 'firebase/firestore';
import type { Supervisor, SystemUser } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { AddSupervisorForm } from './add-supervisor-form';
import { EditSupervisorForm } from './edit-supervisor-form';
import { Badge } from './ui/badge';

const statusLabel: Record<SystemUser['status'], string> = {
  active: 'Hoạt động',
  pending: 'Chờ',
  disabled: 'Vô hiệu hóa',
};

const statusVariant: Record<SystemUser['status'], 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  pending: 'secondary',
  disabled: 'destructive',
};

export function SupervisorManagementTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [supervisorToDisable, setSupervisorToDisable] = useState<Supervisor | null>(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [guidanceFilter, setGuidanceFilter] = useState('all');

  const supervisorsCollectionRef = useMemoFirebase(
    () => collection(firestore, 'supervisors'),
    [firestore]
  );
  
  const { data: supervisors, isLoading: isLoadingSupervisors } = useCollection<Supervisor>(supervisorsCollectionRef);

  const usersCollectionRef = useMemoFirebase(
    () => collection(firestore, 'users'),
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers } = useCollection<SystemUser>(usersCollectionRef);

  const supervisorsWithStatus = useMemo(() => {
    if (!supervisors || !users) return [];
    const userStatusMap = new Map(users.map(u => [u.id, u.status]));
    return supervisors.map(s => ({
      ...s,
      status: userStatusMap.get(s.id) || 'pending',
    }));
  }, [supervisors, users]);


  const filteredSupervisors = useMemo(() => {
    if (!supervisorsWithStatus) return [];
    return supervisorsWithStatus.filter(supervisor => {
      const term = searchTerm.toLowerCase();
      const nameMatch = `${supervisor.firstName} ${supervisor.lastName}`.toLowerCase().includes(term);
      const emailMatch = supervisor.email?.toLowerCase().includes(term);
      const departmentMatch = supervisor.department?.toLowerCase().includes(term);
      
      const guidanceMatch = guidanceFilter === 'all' ||
        (guidanceFilter === 'graduation' && supervisor.canGuideGraduation) ||
        (guidanceFilter === 'internship' && supervisor.canGuideInternship) ||
        (guidanceFilter === 'both' && supervisor.canGuideGraduation && supervisor.canGuideInternship) ||
        (guidanceFilter === 'none' && !supervisor.canGuideGraduation && !supervisor.canGuideInternship);

      return (nameMatch || emailMatch || departmentMatch) && guidanceMatch;
    });
  }, [supervisorsWithStatus, searchTerm, guidanceFilter]);
  
  const handleEditClick = (supervisor: Supervisor) => {
    setSelectedSupervisor(supervisor);
    setIsEditDialogOpen(true);
  };
  
  const handleDisableClick = (supervisor: Supervisor) => {
    setSupervisorToDisable(supervisor);
    setIsDeleteDialogOpen(true);
  };

  const confirmDisable = async () => {
    if (!supervisorToDisable) return;
    const userDocRef = doc(firestore, 'users', supervisorToDisable.id);
    try {
      await updateDoc(userDocRef, { status: 'disabled' });
      toast({
        title: 'Thành công',
        description: `Tài khoản của giáo viên ${supervisorToDisable.firstName} ${supervisorToDisable.lastName} đã được vô hiệu hóa.`,
      });
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Không thể vô hiệu hóa tài khoản: ${error.message}`,
      });
    } finally {
        setIsDeleteDialogOpen(false);
        setSupervisorToDisable(null);
    }
  };
  
  const isLoading = isLoadingSupervisors || isLoadingUsers;

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

  const getGuidanceBadges = (supervisor: Supervisor) => {
    const badges = [];
    if (supervisor.canGuideGraduation) {
      badges.push(<Badge key="grad" variant="outline" className="text-primary border-primary">TN</Badge>);
    }
    if (supervisor.canGuideInternship) {
      badges.push(<Badge key="intern" variant="outline" className="text-secondary-foreground border-secondary-foreground">TT</Badge>);
    }
    if (badges.length === 0) {
      return <span className="text-xs text-muted-foreground">Chưa có</span>
    }
    return <div className="flex items-center gap-1">{badges}</div>;
  };

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
            <div className="flex w-full sm:w-auto items-center gap-2">
                 <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1 text-sm w-full sm:w-auto">
                      <ListFilter className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only">Lọc</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Phạm vi hướng dẫn</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={guidanceFilter === 'all'}
                      onCheckedChange={() => setGuidanceFilter('all')}
                    >
                      Tất cả
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={guidanceFilter === 'graduation'}
                      onCheckedChange={() => setGuidanceFilter('graduation')}
                    >
                      Tốt nghiệp
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={guidanceFilter === 'internship'}
                      onCheckedChange={() => setGuidanceFilter('internship')}
                    >
                      Thực tập
                    </DropdownMenuCheckboxItem>
                     <DropdownMenuCheckboxItem
                      checked={guidanceFilter === 'both'}
                      onCheckedChange={() => setGuidanceFilter('both')}
                    >
                      Cả hai
                    </DropdownMenuCheckboxItem>
                     <DropdownMenuCheckboxItem
                      checked={guidanceFilter === 'none'}
                      onCheckedChange={() => setGuidanceFilter('none')}
                    >
                      Không hướng dẫn
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto">
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
              <TableHead>Phạm vi HD</TableHead>
              <TableHead>Trạng thái</TableHead>
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
                <TableCell>{getGuidanceBadges(supervisor)}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[supervisor.status]}>{statusLabel[supervisor.status]}</Badge>
                </TableCell>
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
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDisableClick(supervisor)}>Vô hiệu hóa</DropdownMenuItem>
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
            <AlertDialogTitle>Vô hiệu hóa tài khoản?</AlertDialogTitle>
            <AlertDialogDescription>
                Hành động này sẽ ngăn giáo viên đăng nhập vào hệ thống, nhưng tất cả dữ liệu lịch sử của họ sẽ được giữ lại. Bạn có chắc chắn muốn tiếp tục?
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisable} className="bg-destructive hover:bg-destructive/90">Xác nhận Vô hiệu hóa</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
