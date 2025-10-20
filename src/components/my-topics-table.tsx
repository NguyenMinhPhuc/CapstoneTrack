
'use client';

import React, { useState, useMemo } from 'react';
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
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription
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
import { MoreHorizontal, PlusCircle, Check, X } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import type { ProjectTopic, GraduationDefenseSession, DefenseRegistration } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AddTopicForm } from './add-topic-form';
import { EditTopicForm } from './edit-topic-form';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MyTopicsTableProps {
    supervisorId: string;
    supervisorName: string;
}

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

const registrationStatusLabel: Record<string, string> = {
    pending: 'Chờ xác nhận',
    approved: 'Đã xác nhận',
    rejected: 'Đã từ chối',
};

const registrationStatusVariant: Record<string, 'secondary' | 'default' | 'destructive'> = {
    pending: 'secondary',
    approved: 'default',
    rejected: 'destructive',
};

export function MyTopicsTable({ supervisorId, supervisorName }: MyTopicsTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<ProjectTopic | null>(null);
  const [sessionFilter, setSessionFilter] = useState('all');

  const topicsQuery = useMemoFirebase(
    () => query(collection(firestore, 'projectTopics'), where('supervisorId', '==', supervisorId)),
    [firestore, supervisorId]
  );
  const { data: topics, isLoading: isLoadingTopics } = useCollection<ProjectTopic>(topicsQuery);
  
  const sessionsQuery = useMemoFirebase(
    () => collection(firestore, 'graduationDefenseSessions'),
    [firestore]
  );
  const { data: sessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);

  const registrationsQuery = useMemoFirebase(
    () => query(collection(firestore, 'defenseRegistrations'), where('supervisorId', '==', supervisorId)),
    [firestore, supervisorId]
  );
  const { data: allRegistrations, isLoading: isLoadingRegs } = useCollection<DefenseRegistration>(registrationsQuery);

  const sessionMap = useMemo(() => {
    if (!sessions) return new Map();
    return new Map(sessions.map(s => [s.id, s.name]));
  }, [sessions]);

  const registrationsByTopic = useMemo(() => {
      const map = new Map<string, DefenseRegistration[]>();
      if (allRegistrations) {
          allRegistrations.forEach(reg => {
              if (reg.projectTitle) {
                  const key = `${reg.sessionId}-${reg.projectTitle}`;
                  if (!map.has(key)) {
                      map.set(key, []);
                  }
                  map.get(key)?.push(reg);
              }
          });
      }
      return map;
  }, [allRegistrations]);


  const filteredTopics = useMemo(() => {
    if (!topics) return [];
    if (sessionFilter === 'all') return topics;
    return topics.filter(topic => topic.sessionId === sessionFilter);
  }, [topics, sessionFilter]);


  const handleEditClick = (topic: ProjectTopic) => {
    setSelectedTopic(topic);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteClick = (topic: ProjectTopic) => {
    setSelectedTopic(topic);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedTopic) return;
    try {
      await deleteDoc(doc(firestore, 'projectTopics', selectedTopic.id));
      toast({
        title: 'Thành công',
        description: `Đề tài "${selectedTopic.title}" đã được xóa.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Không thể xóa đề tài: ${error.message}`,
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedTopic(null);
    }
  };

  const handleRegistrationConfirmation = async (registrationId: string, topic: ProjectTopic, action: 'approve' | 'reject') => {
    const regDocRef = doc(firestore, 'defenseRegistrations', registrationId);
    const topicRef = doc(firestore, 'projectTopics', topic.id);

    const batch = writeBatch(firestore);

    if (action === 'approve') {
        batch.update(regDocRef, { projectRegistrationStatus: 'approved' });

        // Check if the topic will be full after this approval
        const registrationsForThisTopic = allRegistrations?.filter(r => r.sessionId === topic.sessionId && r.projectTitle === topic.title) || [];
        const approvedCount = registrationsForThisTopic.filter(r => r.projectRegistrationStatus === 'approved').length;

        if (approvedCount + 1 >= topic.maxStudents) {
            batch.update(topicRef, { status: 'taken' });
        }

        try {
            await batch.commit();
            toast({ title: 'Thành công', description: 'Đã xác nhận hướng dẫn sinh viên.' });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Lỗi', description: `Không thể cập nhật: ${error.message}` });
        }

    } else { // reject action
        batch.update(regDocRef, { 
            projectRegistrationStatus: 'rejected',
            projectTitle: '',
            summary: '',
            objectives: '',
            expectedResults: '',
            supervisorId: '',
            supervisorName: '',
        });

        // If the topic was 'taken', set it back to 'approved' so others can register
        if (topic.status === 'taken') {
            batch.update(topicRef, { status: 'approved' });
        }
        
        try {
            await batch.commit();
            toast({ title: 'Thành công', description: 'Đã từ chối hướng dẫn. Đề tài đã được mở lại.' });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Lỗi', description: `Không thể cập nhật: ${error.message}` });
        }
    }
  }
  
  const isLoading = isLoadingTopics || isLoadingSessions || isLoadingRegs;

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
              <CardDescription>Các đề tài bạn đã đề xuất cho các đợt báo cáo. Nhấp vào số lượng sinh viên ở cột "SL SV" để xác nhận đăng ký.</CardDescription>
            </div>
             <div className="flex items-center gap-2">
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
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Thêm Đề tài mới
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                    <AddTopicForm 
                        supervisorId={supervisorId}
                        supervisorName={supervisorName}
                        sessions={sessions || []}
                        onFinished={() => setIsAddDialogOpen(false)} 
                    />
                </DialogContent>
                </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên Đề tài</TableHead>
                <TableHead>Lĩnh vực</TableHead>
                <TableHead>Đợt báo cáo</TableHead>
                <TableHead>SL SV</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTopics?.map((topic) => {
                 const registeredStudents = registrationsByTopic.get(`${topic.sessionId}-${topic.title}`) || [];
                 const registeredCount = registeredStudents.length;
                return (
                    <TableRow key={topic.id}>
                    <TableCell className="font-medium max-w-sm">
                        <p className="truncate">{topic.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{topic.summary}</p>
                    </TableCell>
                    <TableCell>{topic.field}</TableCell>
                    <TableCell>{sessionMap.get(topic.sessionId) || 'N/A'}</TableCell>
                    <TableCell>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" disabled={registeredCount === 0} className="p-1 h-auto">
                                    <Badge variant="outline">{registeredCount}/{topic.maxStudents}</Badge>
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Danh sách sinh viên đăng ký</DialogTitle>
                                    <DialogDescription>
                                        Đề tài: {topic.title}
                                    </DialogDescription>
                                </DialogHeader>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>MSSV</TableHead>
                                            <TableHead>Họ và Tên</TableHead>
                                            <TableHead>Trạng thái</TableHead>
                                            <TableHead className="text-right">Hành động</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {registeredStudents.map(reg => (
                                            <TableRow key={reg.id}>
                                                <TableCell>{reg.studentId}</TableCell>
                                                <TableCell>{reg.studentName}</TableCell>
                                                <TableCell>
                                                    <Badge variant={registrationStatusVariant[reg.projectRegistrationStatus || 'pending']}>
                                                        {registrationStatusLabel[reg.projectRegistrationStatus || 'pending']}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {(!reg.projectRegistrationStatus || reg.projectRegistrationStatus === 'pending') && (
                                                        <div className="flex gap-2 justify-end">
                                                            <Button size="sm" variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200 h-8" onClick={() => handleRegistrationConfirmation(reg.id, topic, 'approve')}>
                                                                <Check className="mr-2 h-4 w-4"/> Chấp nhận
                                                            </Button>
                                                            <Button size="sm" variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200 h-8" onClick={() => handleRegistrationConfirmation(reg.id, topic, 'reject')}>
                                                                <X className="mr-2 h-4 w-4"/> Từ chối
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </DialogContent>
                        </Dialog>
                    </TableCell>
                    <TableCell>
                        <Badge variant={statusVariant[topic.status]}>
                            {statusLabel[topic.status]}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={topic.status === 'taken' || topic.status === 'approved'}>
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(topic)}>Sửa</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(topic)}>Xóa</DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedTopic && (
            <EditTopicForm
              topic={selectedTopic}
              sessions={sessions || []}
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
              Hành động này không thể hoàn tác. Đề tài sẽ bị xóa vĩnh viễn.
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
