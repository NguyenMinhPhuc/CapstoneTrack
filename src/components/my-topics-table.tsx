
'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { MoreHorizontal, PlusCircle, Check, X, Eye, FileSignature, Book, Target, CheckCircle, Link as LinkIcon, FileUp, Activity, AlertTriangle, Move } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, deleteDoc, query, where, writeBatch, updateDoc } from 'firebase/firestore';
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
} from './ui/select';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { ViewProgressDialog } from './view-progress-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { MoveTopicsDialog } from './move-topics-dialog';


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

const proposalStatusLabel: Record<string, string> = {
    not_submitted: 'Chưa nộp',
    pending_approval: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Bị từ chối',
};

const proposalStatusVariant: Record<string, 'outline' | 'secondary' | 'default' | 'destructive'> = {
    not_submitted: 'outline',
    pending_approval: 'secondary',
    approved: 'default',
    rejected: 'destructive',
};

const reportStatusLabel: Record<string, string> = {
    not_submitted: 'Chưa nộp',
    pending_approval: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Bị từ chối',
};

const reportStatusVariant: Record<string, 'outline' | 'secondary' | 'default' | 'destructive'> = {
    not_submitted: 'outline',
    pending_approval: 'secondary',
    approved: 'default',
    rejected: 'destructive',
};


export function MyTopicsTable({ supervisorId, supervisorName }: MyTopicsTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  
  const [selectedTopic, setSelectedTopic] = useState<ProjectTopic | null>(null);
  const [selectedRegistration, setSelectedRegistration] = useState<DefenseRegistration | null>(null);
  const [sessionFilter, setSessionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

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
  
  useEffect(() => {
    setSelectedRowIds([]);
  }, [topics, sessionFilter, statusFilter]);

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
    
    return topics.filter(topic => {
      const sessionMatch = sessionFilter === 'all' || topic.sessionId === sessionFilter;
      const statusMatch = statusFilter === 'all' || topic.status === statusFilter;
      return sessionMatch && statusMatch;
    });
  }, [topics, sessionFilter, statusFilter]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
        setSelectedRowIds(filteredTopics?.map(t => t.id) || []);
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
  
  const handleMoveFinished = () => {
    setIsMoveDialogOpen(false);
    setSelectedRowIds([]);
  }

  const handleEditClick = (topic: ProjectTopic) => {
    setSelectedTopic(topic);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteClick = (topic: ProjectTopic) => {
    setSelectedTopic(topic);
    setIsDeleteDialogOpen(true);
  };
  
  const handleViewProposalClick = (registration: DefenseRegistration) => {
    setSelectedRegistration(registration);
    setIsProposalDialogOpen(true);
  }

  const handleViewReportClick = (registration: DefenseRegistration) => {
    setSelectedRegistration(registration);
    setIsReportDialogOpen(true);
  }
  
  const handleViewProgressClick = (registration: DefenseRegistration) => {
    setSelectedRegistration(registration);
    setIsProgressDialogOpen(true);
  }

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

  const handleRegistrationAction = async (registrationId: string, topic: ProjectTopic, action: 'approve' | 'reject' | 'cancel') => {
    const regDocRef = doc(firestore, 'defenseRegistrations', registrationId);
    const topicRef = doc(firestore, 'projectTopics', topic.id);
    const batch = writeBatch(firestore);

    if (action === 'approve') {
        batch.update(regDocRef, { projectRegistrationStatus: 'approved' });

        const registrationsForThisTopic = allRegistrations?.filter(r => r.sessionId === topic.sessionId && r.projectTitle === topic.title) || [];
        const approvedCount = registrationsForThisTopic.filter(r => r.projectRegistrationStatus === 'approved').length;

        if (approvedCount + 1 >= topic.maxStudents) {
            batch.update(topicRef, { status: 'taken' });
        }
    } else { // 'reject' or 'cancel' have the same logic of clearing the student's topic registration
        batch.update(regDocRef, { 
            projectRegistrationStatus: action === 'reject' ? 'rejected' : null,
            projectTitle: '',
            summary: '',
            objectives: '',
            expectedResults: '',
            supervisorId: '',
            supervisorName: '',
        });

        if (topic.status === 'taken') {
            batch.update(topicRef, { status: 'approved' });
        }
    }

    try {
        await batch.commit();
        const successMessage = action === 'approve' 
            ? 'Đã xác nhận hướng dẫn sinh viên.'
            : (action === 'reject' ? 'Đã từ chối hướng dẫn.' : 'Đã hủy đăng ký cho sinh viên.');
        toast({ title: 'Thành công', description: successMessage });
    } catch (error: any) {
         toast({ variant: 'destructive', title: 'Lỗi', description: `Không thể cập nhật: ${error.message}` });
         const contextualError = new FirestorePermissionError({
            path: `batch write on topic ${topic.id} and registration ${registrationId}`,
            operation: 'update',
        });
        errorEmitter.emit('permission-error', contextualError);
    }
  }

  const handleProposalAction = async (registration: DefenseRegistration, action: 'approve' | 'reject') => {
    const regDocRef = doc(firestore, 'defenseRegistrations', registration.id);
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    try {
      await updateDoc(regDocRef, { proposalStatus: newStatus });
      toast({
        title: 'Thành công',
        description: `Đã ${action === 'approve' ? 'duyệt' : 'yêu cầu chỉnh sửa'} thuyết minh.`,
      });
      setIsProposalDialogOpen(false);
    } catch (error: any) {
       toast({ variant: 'destructive', title: 'Lỗi', description: `Không thể cập nhật: ${error.message}` });
        const contextualError = new FirestorePermissionError({
            path: regDocRef.path,
            operation: 'update',
            requestResourceData: { proposalStatus: newStatus }
        });
        errorEmitter.emit('permission-error', contextualError);
    }
  }

  const handleReportAction = async (registration: DefenseRegistration, action: 'approve' | 'reject') => {
    const regDocRef = doc(firestore, 'defenseRegistrations', registration.id);
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    try {
      await updateDoc(regDocRef, { reportStatus: newStatus });
      toast({
        title: 'Thành công',
        description: `Đã ${action === 'approve' ? 'duyệt' : 'yêu cầu chỉnh sửa'} báo cáo.`,
      });
      setIsReportDialogOpen(false);
    } catch (error: any) {
       toast({ variant: 'destructive', title: 'Lỗi', description: `Không thể cập nhật: ${error.message}` });
        const contextualError = new FirestorePermissionError({
            path: regDocRef.path,
            operation: 'update',
            requestResourceData: { reportStatus: newStatus }
        });
        errorEmitter.emit('permission-error', contextualError);
    }
  }
  
  const isLoading = isLoadingTopics || isLoadingSessions || isLoadingRegs;

  const isAllSelected = filteredTopics && selectedRowIds.length > 0 && selectedRowIds.length === filteredTopics.length;
  const isSomeSelected = selectedRowIds.length > 0 && (!filteredTopics || selectedRowIds.length < filteredTopics.length);

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
              <CardDescription>Các đề tài bạn đã đề xuất. Nhấp vào hàng để xem chi tiết.</CardDescription>
            </div>
             <div className="flex items-center gap-2">
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
          {selectedRowIds.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
                <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Move className="mr-2 h-4 w-4" />
                            Chuyển sang đợt khác ({selectedRowIds.length})
                        </Button>
                    </DialogTrigger>
                    <MoveTopicsDialog 
                        sessions={sessions || []}
                        topicIds={selectedRowIds}
                        onFinished={handleMoveFinished}
                    />
                </Dialog>
            </div>
          )}
        </CardHeader>
        <CardContent>
           <div className="border rounded-md">
            <div className="grid grid-cols-12 w-full text-left text-sm font-semibold items-center gap-4 px-4 py-2 bg-muted/50">
                <div className="col-span-1 text-center pl-8">STT</div>
                <div className="col-span-4">Tên đề tài</div>
                <div className="col-span-2">Đợt báo cáo</div>
                <div className="col-span-1 text-center">SL SV</div>
                <div className="col-span-2">Trạng thái</div>
                <div className="col-span-2 text-right pr-8">Hành động</div>
            </div>
            <Accordion type="multiple" className="w-full">
                {filteredTopics.length > 0 ? (
                    filteredTopics.map((topic, index) => {
                        const registeredStudents = registrationsByTopic.get(`${topic.sessionId}-${topic.title}`) || [];
                        const registeredCount = registeredStudents.length;
                        return (
                            <AccordionItem value={topic.id} key={topic.id} className="border-b last:border-b-0">
                                <div className="flex items-center px-4 hover:bg-muted/50 data-[state=open]:bg-muted/50">
                                    <div className="py-4" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selectedRowIds.includes(topic.id)}
                                            onCheckedChange={(checked) => handleRowSelect(topic.id, !!checked)}
                                        />
                                    </div>
                                    <AccordionTrigger className="w-full p-0 hover:no-underline flex-1">
                                        <div className="grid grid-cols-12 w-full text-left text-sm items-center gap-4 py-4 pl-3">
                                            <div className="col-span-1 text-center">{index + 1}</div>
                                            <div className="col-span-4 font-medium truncate" title={topic.title}>{topic.title}</div>
                                            <div className="col-span-2 truncate">{sessionMap.get(topic.sessionId) || 'N/A'}</div>
                                            <div className="col-span-1 text-center">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" disabled={registeredCount === 0} className="p-1 h-auto" onClick={(e) => e.stopPropagation()}>
                                                            <Badge variant="outline">{registeredCount}/{topic.maxStudents}</Badge>
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-4xl">
                                                        <DialogHeader>
                                                            <DialogTitle>Danh sách sinh viên đăng ký</DialogTitle>
                                                            <DialogDescription>Đề tài: {topic.title}</DialogDescription>
                                                        </DialogHeader>
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>MSSV</TableHead>
                                                                    <TableHead>Họ và Tên</TableHead>
                                                                    <TableHead>Trạng thái ĐK</TableHead>
                                                                    <TableHead>Trạng thái TM</TableHead>
                                                                    <TableHead>Trạng thái BC</TableHead>
                                                                    <TableHead className="text-right">Hành động</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {registeredStudents.map(reg => (
                                                                    <TableRow key={reg.id}>
                                                                        <TableCell>{reg.studentId}</TableCell>
                                                                        <TableCell>{reg.studentName}</TableCell>
                                                                        <TableCell><Badge variant={registrationStatusVariant[reg.projectRegistrationStatus || 'pending']}>{registrationStatusLabel[reg.projectRegistrationStatus || 'pending']}</Badge></TableCell>
                                                                        <TableCell><Badge variant={proposalStatusVariant[reg.proposalStatus || 'not_submitted']}>{proposalStatusLabel[reg.proposalStatus || 'not_submitted']}</Badge></TableCell>
                                                                        <TableCell><Badge variant={reportStatusVariant[reg.reportStatus || 'not_submitted']}>{reportStatusLabel[reg.reportStatus || 'not_submitted']}</Badge></TableCell>
                                                                        <TableCell className="text-right">
                                                                            <div className="flex gap-2 justify-end">
                                                                                {(!reg.projectRegistrationStatus || reg.projectRegistrationStatus === 'pending') && (<>
                                                                                    <Button size="sm" variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200 h-8" onClick={() => handleRegistrationAction(reg.id, topic, 'approve')}><Check className="mr-2 h-4 w-4" /> Chấp nhận</Button>
                                                                                    <Button size="sm" variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200 h-8" onClick={() => handleRegistrationAction(reg.id, topic, 'reject')}><X className="mr-2 h-4 w-4" /> Từ chối</Button>
                                                                                </>)}
                                                                                {reg.projectRegistrationStatus === 'approved' && (<>
                                                                                    <Button size="sm" variant="outline" className="h-8" onClick={() => handleViewProgressClick(reg)}><Activity className="mr-2 h-4 w-4" /> Xem TĐ</Button>
                                                                                    <Button size="sm" variant="outline" className="h-8" onClick={() => handleViewProposalClick(reg)} disabled={reg.proposalStatus === 'not_submitted'}><Eye className="mr-2 h-4 w-4" /> Xem TM</Button>
                                                                                    <Button size="sm" variant="outline" className="h-8" onClick={() => handleViewReportClick(reg)} disabled={reg.reportStatus === 'not_submitted'}><Eye className="mr-2 h-4 w-4" /> Xem BC</Button>
                                                                                    <Button size="sm" variant="destructive" className="h-8" onClick={() => handleRegistrationAction(reg.id, topic, 'cancel')}><X className="mr-2 h-4 w-4" /> Hủy ĐK</Button>
                                                                                </>)}
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                            <div className="col-span-2"><Badge variant={statusVariant[topic.status]}>{statusLabel[topic.status]}</Badge></div>
                                        </div>
                                    </AccordionTrigger>
                                    <div className="col-span-1 flex justify-end pr-4">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEditClick(topic)} disabled={topic.status === 'taken'}>Sửa</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(topic)} disabled={topic.status === 'taken'}>Xóa</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                                <AccordionContent>
                                    <div className="p-4 bg-muted/30">
                                        <div className="space-y-6">
                                            {topic.status === 'rejected' && topic.rejectionReason && (
                                                <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Lý do từ chối</AlertTitle><AlertDescription>{topic.rejectionReason}</AlertDescription></Alert>
                                            )}
                                            <div className="space-y-1"><h4 className="font-semibold flex items-center gap-2 text-base"><Book className="h-4 w-4 text-primary" /> Tóm tắt</h4><div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"><ReactMarkdown remarkPlugins={[remarkGfm]}>{topic.summary || ''}</ReactMarkdown></div></div>
                                            <div className="space-y-1"><h4 className="font-semibold flex items-center gap-2 text-base"><Target className="h-4 w-4 text-primary" /> Mục tiêu</h4><div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"><ReactMarkdown remarkPlugins={[remarkGfm]}>{topic.objectives || ''}</ReactMarkdown></div></div>
                                            <div className="space-y-1"><h4 className="font-semibold flex items-center gap-2 text-base"><CheckCircle className="h-4 w-4 text-primary" /> Kết quả mong đợi</h4><div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"><ReactMarkdown remarkPlugins={[remarkGfm]}>{topic.expectedResults || ''}</ReactMarkdown></div></div>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })
                ) : (
                    <tr><td colSpan={7} className="h-24 text-center">Không có đề tài nào phù hợp.</td></tr>
                )}
            </Accordion>
        </div>
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
      
       <Dialog open={isProposalDialogOpen} onOpenChange={setIsProposalDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
              {selectedRegistration && (
                  <>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><FileSignature /> Thuyết minh của sinh viên</DialogTitle>
                        <DialogDescription>
                            Xem xét và phê duyệt thuyết minh của sinh viên: {selectedRegistration.studentName} ({selectedRegistration.studentId})
                        </DialogDescription>
                    </DialogHeader>
                     <div className="space-y-6 max-h-[60vh] overflow-y-auto p-4 border rounded-md">
                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg">{selectedRegistration.projectTitle}</h3>
                        </div>
                        <Separator/>
                        <div className="space-y-1">
                             <h4 className="font-semibold flex items-center gap-2 text-base"><Book className="h-4 w-4 text-primary" /> Tóm tắt</h4>
                            <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedRegistration.summary || ''}</ReactMarkdown>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-semibold flex items-center gap-2 text-base"><Target className="h-4 w-4 text-primary" /> Mục tiêu</h4>
                            <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedRegistration.objectives || ''}</ReactMarkdown>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-semibold flex items-center gap-2 text-base"><FileSignature className="h-4 w-4 text-primary" /> Phương pháp & Công nghệ</h4>
                            <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedRegistration.implementationPlan || ''}</ReactMarkdown>
                            </div>
                        </div>
                        <div className="space-y-1">
                             <h4 className="font-semibold flex items-center gap-2 text-base"><CheckCircle className="h-4 w-4 text-primary" /> Kết quả mong đợi</h4>
                            <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedRegistration.expectedResults || ''}</ReactMarkdown>
                            </div>
                        </div>
                        {selectedRegistration.proposalLink && (
                            <div className="space-y-1">
                                <h4 className="font-semibold flex items-center gap-2 text-base"><LinkIcon className="h-4 w-4 text-primary" /> Link file toàn văn</h4>
                                <a href={selectedRegistration.proposalLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline break-all">
                                    {selectedRegistration.proposalLink}
                                </a>
                            </div>
                        )}
                    </div>
                     <DialogFooter>
                        <Button variant="destructive" onClick={() => handleProposalAction(selectedRegistration, 'reject')}>
                            Yêu cầu chỉnh sửa
                        </Button>
                        <Button onClick={() => handleProposalAction(selectedRegistration, 'approve')}>
                            Duyệt thuyết minh
                        </Button>
                    </DialogFooter>
                  </>
              )}
          </DialogContent>
       </Dialog>
       
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
              {selectedRegistration && (
                  <>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><FileUp /> Báo cáo cuối kỳ của sinh viên</DialogTitle>
                        <DialogDescription>
                            Xem xét và phê duyệt báo cáo cuối kỳ của sinh viên: {selectedRegistration.studentName} ({selectedRegistration.studentId})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 max-h-[60vh] overflow-y-auto p-4 border rounded-md">
                        <p className="text-sm text-muted-foreground">Thông tin dưới đây là bản tóm tắt cuối cùng sinh viên đã nộp.</p>
                        <div className="space-y-1">
                             <h4 className="font-semibold flex items-center gap-2 text-base"><LinkIcon className="h-4 w-4 text-primary" /> Link file báo cáo toàn văn</h4>
                            {selectedRegistration.reportLink ? (
                                <a href={selectedRegistration.reportLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline break-all">
                                    {selectedRegistration.reportLink}
                                </a>
                            ) : (
                                <p className="text-sm text-muted-foreground">Sinh viên chưa nộp link báo cáo.</p>
                            )}
                        </div>
                    </div>
                     <DialogFooter>
                        <Button variant="destructive" onClick={() => handleReportAction(selectedRegistration, 'reject')}>
                            Yêu cầu chỉnh sửa
                        </Button>
                        <Button onClick={() => handleReportAction(selectedRegistration, 'approve')}>
                            Duyệt Báo cáo
                        </Button>
                    </DialogFooter>
                  </>
              )}
          </DialogContent>
       </Dialog>
       
      <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
           <DialogContent className="sm:max-w-2xl">
                {selectedRegistration && (
                   <ViewProgressDialog
                        registration={selectedRegistration}
                        onFinished={() => setIsProgressDialogOpen(false)}
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
