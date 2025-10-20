
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Check, X, Search } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, query } from 'firebase/firestore';
import type { ProjectTopic, GraduationDefenseSession } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from './ui/input';

const statusLabel: Record<ProjectTopic['status'], string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Bị từ chối',
  taken: 'Đã có SV',
};

const statusVariant: Record<ProjectTopic['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  taken: 'outline',
};

export function TopicManagementTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [sessionFilter, setSessionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const topicsQuery = useMemoFirebase(
    () => query(collection(firestore, 'projectTopics')),
    [firestore]
  );
  const { data: topics, isLoading: isLoadingTopics } = useCollection<ProjectTopic>(topicsQuery);
  
  const sessionsQuery = useMemoFirebase(
    () => collection(firestore, 'graduationDefenseSessions'),
    [firestore]
  );
  const { data: sessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);

  const sessionMap = useMemo(() => {
    if (!sessions) return new Map();
    return new Map(sessions.map(s => [s.id, s.name]));
  }, [sessions]);

  const filteredTopics = useMemo(() => {
    if (!topics) return [];
    
    return topics.filter(topic => {
      const sessionMatch = sessionFilter === 'all' || topic.sessionId === sessionFilter;
      const statusMatch = statusFilter === 'all' || topic.status === statusFilter;
      const term = searchTerm.toLowerCase();
      const searchMatch = topic.title.toLowerCase().includes(term) || topic.supervisorName.toLowerCase().includes(term) || (topic.field && topic.field.toLowerCase().includes(term));

      return sessionMatch && statusMatch && searchMatch;
    });

  }, [topics, sessionFilter, statusFilter, searchTerm]);

  const handleStatusChange = async (topicId: string, newStatus: 'approved' | 'rejected') => {
    const topicRef = doc(firestore, 'projectTopics', topicId);
    try {
        await updateDoc(topicRef, { status: newStatus });
        toast({
            title: "Thành công",
            description: `Trạng thái đề tài đã được cập nhật.`,
        });
    } catch(error: any) {
        toast({
            variant: "destructive",
            title: "Lỗi",
            description: `Không thể cập nhật trạng thái: ${error.message}`,
        })
    }
  };
  
  const isLoading = isLoadingTopics || isLoadingSessions;

  if (isLoading) {
    return (
      <Card>
          <CardHeader>
              <Skeleton className="h-8 w-1/4" />
          </CardHeader>
          <CardContent>
              <Skeleton className="h-64 w-full" />
          </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách Đề tài</CardTitle>
              <CardDescription>Xem và duyệt các đề tài do giáo viên đề xuất.</CardDescription>
            </div>
             <div className="flex items-center gap-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Tìm theo tên đề tài, GV, lĩnh vực..."
                        className="pl-8 w-full sm:w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Lọc theo trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                        {Object.entries(statusLabel).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={sessionFilter} onValueChange={setSessionFilter}>
                    <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Lọc theo đợt báo cáo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả các đợt</SelectItem>
                        {sessions?.map(session => (
                            <SelectItem key={session.id} value={session.id}>{session.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên Đề tài</TableHead>
                <TableHead>Lĩnh vực</TableHead>
                <TableHead>GVHD</TableHead>
                <TableHead>Đợt báo cáo</TableHead>
                <TableHead>SL SV</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTopics?.map((topic) => (
                <TableRow key={topic.id}>
                  <TableCell className="font-medium max-w-sm">
                    <p className="truncate">{topic.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{topic.summary}</p>
                  </TableCell>
                  <TableCell>{topic.field}</TableCell>
                  <TableCell>{topic.supervisorName}</TableCell>
                  <TableCell>{sessionMap.get(topic.sessionId) || 'N/A'}</TableCell>
                  <TableCell>{topic.maxStudents}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[topic.status]}>
                        {statusLabel[topic.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={topic.status !== 'pending'}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStatusChange(topic.id, 'approved')}>
                            <Check className="mr-2 h-4 w-4" />
                            Duyệt
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleStatusChange(topic.id, 'rejected')}>
                            <X className="mr-2 h-4 w-4" />
                            Từ chối
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    