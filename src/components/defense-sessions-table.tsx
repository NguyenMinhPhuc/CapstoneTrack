
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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Search } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { GraduationDefenseSession } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { AddDefenseSessionForm } from './add-defense-session-form';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

type SessionStatus = 'Sắp diễn ra' | 'Đang thực hiện' | 'Hoàn thành';

const getSessionStatus = (
  startDate: Date,
  expectedReportDate: Date
): SessionStatus => {
  const now = new Date();
  if (now < startDate) {
    return 'Sắp diễn ra';
  } else if (now >= startDate && now <= expectedReportDate) {
    return 'Đang thực hiện';
  } else {
    return 'Hoàn thành';
  }
};

const statusVariant: Record<SessionStatus, 'secondary' | 'default' | 'outline'> = {
  'Sắp diễn ra': 'secondary',
  'Đang thực hiện': 'default',
  'Hoàn thành': 'outline',
};


export function DefenseSessionsTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const sessionsCollectionRef = useMemoFirebase(
    () => collection(firestore, 'graduationDefenseSessions'),
    [firestore]
  );

  const { data: sessions, isLoading } = useCollection<GraduationDefenseSession>(sessionsCollectionRef);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter(session =>
      session.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sessions, searchTerm]);


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
    <div>
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
                const status = session.startDate?.toDate && session.expectedReportDate?.toDate
                  ? getSessionStatus(session.startDate.toDate(), session.expectedReportDate.toDate())
                  : null;

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
                      {status && (
                        <Badge variant={statusVariant[status]}>
                          {status}
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
                          <DropdownMenuItem>Sửa</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Xóa</DropdownMenuItem>
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
    </div>
  );
}
