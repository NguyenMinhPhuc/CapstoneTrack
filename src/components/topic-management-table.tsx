'use client';

import { useState, useMemo } from 'react';
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, Book, Target, CheckCircle, AlertTriangle } from 'lucide-react';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { RejectTopicDialog } from './reject-topic-dialog';
import { Dialog } from './ui/dialog';

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
  const [topicToReject, setTopicToReject] = useState<ProjectTopic | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

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

  const handleStatusChange = async (topicId: string, newStatus: ProjectTopic['status'], reason?: string) => {
    const topicRef = doc(firestore, 'projectTopics', topicId);
    
    if (newStatus === 'rejected' && !reason) {
        const topic = topics?.find(t => t.id === topicId);
        if (topic) {
            setTopicToReject(topic);
            setIsRejectDialogOpen(true);
        }
        return;
    }

    try {
        const updateData: any = { status: newStatus };
        if (newStatus === 'rejected' && reason) {
            updateData.rejectionReason = reason;
        } else if (newStatus !== 'rejected') {
            updateData.rejectionReason = ''; // Clear reason if not rejected
        }

        await updateDoc(topicRef, updateData);
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
          <Accordion type="multiple" className="space-y-2">
            {filteredTopics?.map((topic, index) => (
                <AccordionItem value={topic.id} key={topic.id} className="border rounded-md px-4 bg-background hover:bg-muted/50">
                    <AccordionTrigger className="hover:no-underline">
                        <div className="grid grid-cols-12 w-full text-left text-sm items-center gap-4">
                            <div className="col-span-1 text-center">{index + 1}</div>
                            <div className="col-span-4 font-medium truncate" title={topic.title}>{topic.title}</div>
                            <div className="col-span-2 truncate">{topic.supervisorName}</div>
                            <div className="col-span-2 truncate">{sessionMap.get(topic.sessionId) || 'N/A'}</div>
                            <div className="col-span-1 text-center">{topic.maxStudents}</div>
                            <div className="col-span-1">
                                <Badge variant={statusVariant[topic.status]}>
                                    {statusLabel[topic.status]}
                                </Badge>
                            </div>
                             <div className="col-span-1 flex justify-end">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>
                                                <span>Thay đổi trạng thái</span>
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuPortal>
                                                <DropdownMenuSubContent>
                                                    {(Object.keys(statusLabel) as Array<keyof typeof statusLabel>).map(status => (
                                                        <DropdownMenuItem
                                                            key={status}
                                                            onSelect={(e) => {
                                                                e.preventDefault(); // Prevent closing
                                                                handleStatusChange(topic.id, status)
                                                            }}
                                                            disabled={topic.status === status}
                                                        >
                                                            {statusLabel[status]}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuSubContent>
                                            </DropdownMenuPortal>
                                        </DropdownMenuSub>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                             </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 border-t">
                        <div className="space-y-6">
                            {topic.status === 'rejected' && topic.rejectionReason && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Lý do từ chối</AlertTitle>
                                    <AlertDescription>{topic.rejectionReason}</AlertDescription>
                                </Alert>
                            )}
                            <div className="space-y-1">
                                <h4 className="font-semibold flex items-center gap-2 text-base"><Book className="h-4 w-4 text-primary" /> Tóm tắt</h4>
                                <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{topic.summary || ''}</ReactMarkdown>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-semibold flex items-center gap-2 text-base"><Target className="h-4 w-4 text-primary" /> Mục tiêu</h4>
                                <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{topic.objectives || ''}</ReactMarkdown>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-semibold flex items-center gap-2 text-base"><CheckCircle className="h-4 w-4 text-primary" /> Kết quả mong đợi</h4>
                                <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{topic.expectedResults || ''}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
          </Accordion>
           {filteredTopics.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    Không tìm thấy đề tài nào phù hợp.
                </div>
            )}
        </CardContent>
      </Card>
      
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        {topicToReject && (
          <RejectTopicDialog
            topic={topicToReject}
            onConfirm={(reason) => {
              handleStatusChange(topicToReject.id, 'rejected', reason);
              setIsRejectDialogOpen(false);
              setTopicToReject(null);
            }}
            onCancel={() => {
              setIsRejectDialogOpen(false);
              setTopicToReject(null);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

    