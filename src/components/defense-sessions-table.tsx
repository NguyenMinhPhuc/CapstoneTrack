'use client';

import { useMemo, useState } from 'react';
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
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Search, ListFilter, CalendarClock, CalendarCheck, CalendarX, Package } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { GraduationDefenseSession } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { AddDefenseSessionForm } from './add-defense-session-form';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { EditDefenseSessionForm } from './edit-defense-session-form';

type SessionStatus = 'upcoming' | 'ongoing' | 'completed';
type SessionStatusLabel = 'Sắp diễn ra' | 'Đang thực hiện' | 'Hoàn thành';

const statusLabel: Record<SessionStatus, SessionStatusLabel> = {
  upcoming: 'Sắp diễn ra',
  ongoing: 'Đang thực hiện',
  completed: 'Hoàn thành',
};

const statusVariant: Record<SessionStatus, 'secondary' | 'default' | 'outline'> = {
  upcoming: 'secondary',
  ongoing: 'default',
  completed: 'outline',
};


export function DefenseSessionsTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<GraduationDefenseSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<GraduationDefenseSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const sessionsCollectionRef = useMemoFirebase(
    () => collection(firestore, 'graduationDefenseSessions'),
    [firestore]
  );

  const { data: sessions, isLoading } = useCollection<GraduationDefenseSession>(sessionsCollectionRef);

  const sessionStats = useMemo(() => {
    const stats = {
      total: 0,
      upcoming: 0,
      ongoing: 0,
      completed: 0,
    };
    if (!sessions) return stats;

    return sessions.reduce((acc, session) => {
      acc.total++;
      if (acc[session.status] !== undefined) {
        acc[session.status]++;
      }
      return acc;
    }, stats);
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter(session => {
        const searchMatch = session.name.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'all' || session.status === statusFilter;
        return searchMatch && statusMatch;
    });
  }, [sessions, searchTerm, statusFilter]);
  
  const handleEditClick = (session: GraduationDefenseSession) => {
    setSelectedSession(session);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteClick = (session: GraduationDefenseSession) => {
    setSessionToDelete(session);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    const sessionDocRef = doc(firestore, 'graduationDefenseSessions', sessionToDelete.id);
    try {
      await deleteDoc(sessionDocRef);
      toast({
        title: 'Thành công',
        description: `Đợt báo cáo "${sessionToDelete.name}" đã được xóa.`,
      });
    } catch (error) {
       console.error("Error deleting session:", error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể xóa đợt báo cáo.',
      });
    } finally {
        setIsDeleteDialogOpen(false);
        setSessionToDelete(null);
    }
  };

  const handleStatusChange = async (sessionId: string, newStatus: SessionStatus) => {
    const sessionDocRef = doc(firestore, 'graduationDefenseSessions', sessionId);
    try {
      await updateDoc(sessionDocRef, { status: newStatus });
      toast({
        title: 'Thành công',
        description: `Trạng thái đợt báo cáo đã được cập nhật.`,
      });
    } catch (error) {
      console.error("Error updating session status:", error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái.',
      });
    }
  };


  if (isLoading) {
    return (
       <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                           <Skeleton className="h-4 w-2/4" />
                           <Skeleton className="h-6 w-6 rounded-sm" />
                        </CardHeader>
                        <CardContent>
                           <Skeleton className="h-7 w-1/4 mb-2" />
                        </CardContent>
                    </Card>
                ))}
            </div>
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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tổng số đợt</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{sessionStats.total}</div>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sắp diễn ra</CardTitle>
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{sessionStats.upcoming}</div>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Đang thực hiện</CardTitle>
                  <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{sessionStats.ongoing}</div>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hoàn thành</CardTitle>
                  <CalendarX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{sessionStats.completed}</div>
              </CardContent>
          </Card>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Danh sách các Đợt báo cáo</CardTitle>
              <CardDescription>
                Tạo và quản lý các đợt tổ chức báo cáo tốt nghiệp.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <div className="flex w-full sm:w-auto gap-2">
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Tìm kiếm theo tên..."
                            className="pl-8 w-full sm:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1 text-sm w-full sm:w-auto">
                                <ListFilter className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only">Lọc</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                             <DropdownMenuCheckboxItem
                                checked={statusFilter === 'all'}
                                onCheckedChange={() => setStatusFilter('all')}
                            >
                                Tất cả trạng thái
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={statusFilter === 'upcoming'}
                                onCheckedChange={() => setStatusFilter('upcoming')}
                            >
                                {statusLabel.upcoming}
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={statusFilter === 'ongoing'}
                                onCheckedChange={() => setStatusFilter('ongoing')}
                            >
                                {statusLabel.ongoing}
                            </DropdownMenuCheckboxItem>
                             <DropdownMenuCheckboxItem
                                checked={statusFilter === 'completed'}
                                onCheckedChange={() => setStatusFilter('completed')}
                            >
                                {statusLabel.completed}
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tạo Đợt mới
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                    <DialogTitle>Tạo Đợt báo cáo mới</DialogTitle>
                    <DialogDescription>
                        Điền thông tin chi tiết để tạo một đợt báo cáo mới.
                    </DialogDescription>
                    </DialogHeader>
                    <AddDefenseSessionForm onFinished={() => setIsAddDialogOpen(false)} />
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
                <TableHead>Tên đợt</TableHead>
                <TableHead>Ngày bắt đầu</TableHead>
                <TableHead>Hạn đăng ký</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions?.map((session, index) => {
                return (
                  <TableRow key={session.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{session.name}</TableCell>
                    <TableCell>
                      {session.startDate?.toDate && format(session.startDate.toDate(), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {session.registrationDeadline?.toDate && format(session.registrationDeadline.toDate(), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {session.status && (
                        <Badge variant={statusVariant[session.status]}>
                          {statusLabel[session.status]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(session)}>Sửa</DropdownMenuItem>
                           <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <span>Thay đổi trạng thái</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => handleStatusChange(session.id, 'upcoming')} disabled={session.status === 'upcoming'}>
                                  {statusLabel.upcoming}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(session.id, 'ongoing')} disabled={session.status === 'ongoing'}>
                                  {statusLabel.ongoing}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(session.id, 'completed')} disabled={session.status === 'completed'}>
                                  {statusLabel.completed}
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteClick(session)}>Xóa</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa Đợt báo cáo</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin cho đợt báo cáo. Nhấp vào "Lưu thay đổi" khi hoàn tất.
            </DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <EditDefenseSessionForm
              session={selectedSession}
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
                Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn
                đợt báo cáo và tất cả dữ liệu liên quan khỏi máy chủ của chúng tôi.
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
