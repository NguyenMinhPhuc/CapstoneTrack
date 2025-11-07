
'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, Eye, FileSignature, FileUp, Activity, Book, Target, CheckCircle, Link as LinkIcon, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, Query, doc, updateDoc } from 'firebase/firestore';
import type { DefenseRegistration, GraduationDefenseSession, WeeklyProgressReport } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { ViewProgressDialog } from './view-progress-dialog';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';


interface GraduationGuidanceTableProps {
  supervisorId: string;
  userRole: 'admin' | 'supervisor';
}

type SortKey = 'studentName' | 'projectTitle' | 'proposalStatus' | 'reportStatus';
type SortDirection = 'asc' | 'desc';

const proposalStatusVariant: Record<string, 'outline' | 'secondary' | 'default' | 'destructive'> = {
  not_submitted: 'outline',
  pending_approval: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

const proposalStatusLabel: Record<string, string> = {
    not_submitted: 'Chưa nộp TM',
    pending_approval: 'Chờ duyệt TM',
    approved: 'Đã duyệt TM',
    rejected: 'TM bị từ chối',
};

const reportStatusVariant: Record<string, 'outline' | 'secondary' | 'default' | 'destructive'> = {
    not_submitted: 'outline',
    pending_approval: 'secondary',
    approved: 'default',
    rejected: 'destructive',
};

const reportStatusLabel: Record<string, string> = {
    not_submitted: 'Chưa nộp BC',
    pending_approval: 'Chờ duyệt BC',
    approved: 'Đã duyệt BC',
    rejected: 'BC bị từ chối',
};

const statusLabel: Record<string, string> = {
  ongoing: 'Đang diễn ra',
  upcoming: 'Sắp diễn ra',
  completed: 'Đã hoàn thành',
};

function RegistrationRow({ registration, sessionMap, onAction }: { registration: DefenseRegistration, sessionMap: Map<string, string>, onAction: (type: 'proposal' | 'report' | 'progress', reg: DefenseRegistration) => void }) {
    const [isOpen, setIsOpen] = useState(false);

    const propStatus = registration.proposalStatus || 'not_submitted';
    const propConfig = proposalStatusVariant[propStatus];
    const propLabel = proposalStatusLabel[propStatus];

    const reportStatus = registration.reportStatus || 'not_submitted';
    const reportConfig = reportStatusVariant[reportStatus];
    const reportLabel = reportStatusLabel[reportStatus];

    return (
      <React.Fragment>
        <TableRow className="hover:bg-muted/50 data-[state=open]:bg-muted/50">
          <TableCell className="w-12 p-0">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </Button>
          </TableCell>
          <TableCell>
            <div className="font-medium">{registration.studentName}</div>
            <div className="text-sm text-muted-foreground">{registration.studentId}</div>
          </TableCell>
          <TableCell>
            <p className="font-medium max-w-xs truncate">{registration.projectTitle || 'Chưa có'}</p>
            <p className="text-xs text-muted-foreground">{sessionMap.get(registration.sessionId)}</p>
          </TableCell>
          <TableCell>
            <div className="flex flex-col gap-1.5 items-start">
              <Badge variant={propConfig}>{propLabel}</Badge>
              <Badge variant={reportConfig}>{reportLabel}</Badge>
            </div>
          </TableCell>
          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAction('progress', registration)}><Activity className="mr-2 h-4 w-4" /> Xem tiến độ</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction('proposal', registration)} disabled={propStatus === 'not_submitted'}><Eye className="mr-2 h-4 w-4" /> Xem thuyết minh</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction('report', registration)} disabled={reportStatus === 'not_submitted'}><Eye className="mr-2 h-4 w-4" /> Xem báo cáo</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
        {isOpen && (
          <TableRow className="bg-muted/30 hover:bg-muted/40">
            <TableCell colSpan={5} className="p-0">
              <div className="p-4 space-y-4">
                <div className="space-y-1"><h4 className="font-semibold flex items-center gap-2 text-base"><Book className="h-4 w-4 text-primary" /> Tóm tắt</h4><div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"><ReactMarkdown remarkPlugins={[remarkGfm]}>{registration.summary || ''}</ReactMarkdown></div></div>
                <div className="space-y-1"><h4 className="font-semibold flex items-center gap-2 text-base"><Target className="h-4 w-4 text-primary" /> Mục tiêu</h4><div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"><ReactMarkdown remarkPlugins={[remarkGfm]}>{registration.objectives || ''}</ReactMarkdown></div></div>
                <div className="space-y-1"><h4 className="font-semibold flex items-center gap-2 text-base"><CheckCircle className="h-4 w-4 text-primary" /> Kết quả mong đợi</h4><div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"><ReactMarkdown remarkPlugins={[remarkGfm]}>{registration.expectedResults || ''}</ReactMarkdown></div></div>
              </div>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
}

export function GraduationGuidanceTable({ supervisorId, userRole }: GraduationGuidanceTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('ongoing'); // Default to ongoing
  const [proposalStatusFilter, setProposalStatusFilter] = useState('all');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<DefenseRegistration | null>(null);
  const [isSessionPopoverOpen, setIsSessionPopoverOpen] = useState(false);

  const sessionsQuery = useMemoFirebase(
    () => collection(firestore, 'graduationDefenseSessions'),
    [firestore]
  );
  const { data: sessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);

  const graduationSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter(s => s.sessionType === 'graduation' || s.sessionType === 'combined');
  }, [sessions]);

  const registrationsQuery = useMemoFirebase(() => {
    let q: Query = collection(firestore, 'defenseRegistrations');
    
    const conditions = [];

    if (userRole === 'supervisor') {
        conditions.push(where('supervisorId', '==', supervisorId));
    }
    
    if (selectedSessionId === 'ongoing') {
        const ongoingSessionIds = graduationSessions.filter(s => s.status === 'ongoing').map(s => s.id);
        if (ongoingSessionIds.length > 0) {
            conditions.push(where('sessionId', 'in', ongoingSessionIds));
        } else {
             conditions.push(where('sessionId', '==', '__impossible_value__'));
        }
    } else if (selectedSessionId !== 'all') {
      conditions.push(where('sessionId', '==', selectedSessionId));
    } else {
        const gradSessionIds = graduationSessions.map(s => s.id);
        if (gradSessionIds.length > 0) {
            conditions.push(where('sessionId', 'in', gradSessionIds));
        } else {
            conditions.push(where('sessionId', '==', '__impossible_value__'));
        }
    }
    
    conditions.push(where('graduationStatus', '==', 'reporting'));

    return query(q, ...conditions);
  }, [firestore, supervisorId, selectedSessionId, userRole, graduationSessions]);

  const { data: registrations, isLoading: isLoadingRegistrations } = useCollection<DefenseRegistration>(registrationsQuery);

  const isLoading = isLoadingSessions || isLoadingRegistrations;

  const sessionMap = useMemo(() => {
    if (!sessions) return new Map();
    return new Map(sessions.map(s => [s.id, s.name]));
  }, [sessions]);

  const groupedSessions = useMemo(() => {
    if (!graduationSessions) return { ongoing: [], upcoming: [], completed: [] };
    return graduationSessions.reduce((acc, session) => {
      const group = acc[session.status] || [];
      group.push(session);
      acc[session.status] = group;
      return acc;
    }, {} as Record<GraduationDefenseSession['status'], GraduationDefenseSession[]>);
  }, [graduationSessions]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
        return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    }
    return sortConfig.direction === 'asc' ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />;
  };

  const filteredRegistrations = useMemo(() => {
    if (!registrations) return [];
    
    let sortableRegistrations = [...registrations];

    if (sortConfig !== null) {
      sortableRegistrations.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableRegistrations.filter(reg => {
      const term = searchTerm.toLowerCase();
      const searchMatch = reg.studentName.toLowerCase().includes(term) ||
                          reg.studentId.toLowerCase().includes(term) ||
                          (reg.projectTitle && reg.projectTitle.toLowerCase().includes(term));
      
      const proposalMatch = proposalStatusFilter === 'all' || (reg.proposalStatus || 'not_submitted') === proposalStatusFilter;
      const reportMatch = reportStatusFilter === 'all' || (reg.reportStatus || 'not_submitted') === reportStatusFilter;

      return searchMatch && proposalMatch && reportMatch;
    });

  }, [registrations, searchTerm, proposalStatusFilter, reportStatusFilter, sortConfig]);

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

  const handleActionClick = (type: 'proposal' | 'report' | 'progress', registration: DefenseRegistration) => {
    setSelectedRegistration(registration);
    if (type === 'proposal') setIsProposalDialogOpen(true);
    if (type === 'report') setIsReportDialogOpen(true);
    if (type === 'progress') setIsProgressDialogOpen(true);
  }

  const getSessionDisplayName = () => {
    if (selectedSessionId === 'all') return "Tất cả các đợt";
    if (selectedSessionId === 'ongoing') return "Đợt đang thực hiện";
    return sessionMap.get(selectedSessionId) || "Chọn đợt...";
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
             <div className="relative w-full sm:w-auto flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm sinh viên, đề tài..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <Select value={proposalStatusFilter} onValueChange={setProposalStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Lọc TT Thuyết minh" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả TT Thuyết minh</SelectItem>
                  {Object.entries(proposalStatusLabel).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={reportStatusFilter} onValueChange={setReportStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Lọc TT Báo cáo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả TT Báo cáo</SelectItem>
                  {Object.entries(reportStatusLabel).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover open={isSessionPopoverOpen} onOpenChange={setIsSessionPopoverOpen}>
                  <PopoverTrigger asChild>
                      <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isSessionPopoverOpen}
                          className="w-full sm:w-[250px] justify-between"
                      >
                          {getSessionDisplayName()}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0">
                      <Command>
                          <CommandInput placeholder="Tìm đợt báo cáo..." />
                          <CommandEmpty>Không tìm thấy.</CommandEmpty>
                          <CommandList>
                              <CommandGroup>
                                  <CommandItem
                                      value="all"
                                      onSelect={() => {
                                          setSelectedSessionId('all');
                                          setIsSessionPopoverOpen(false);
                                      }}
                                  >
                                      <Check className={cn("mr-2 h-4 w-4", selectedSessionId === 'all' ? "opacity-100" : "opacity-0")} />
                                      Tất cả các đợt
                                  </CommandItem>
                                  <CommandItem
                                      value="ongoing"
                                      onSelect={() => {
                                          setSelectedSessionId('ongoing');
                                          setIsSessionPopoverOpen(false);
                                      }}
                                  >
                                      <Check className={cn("mr-2 h-4 w-4", selectedSessionId === 'ongoing' ? "opacity-100" : "opacity-0")} />
                                      Đợt đang thực hiện
                                  </CommandItem>
                                  {Object.entries(groupedSessions).map(([status, sessionList]) => (
                                      sessionList.length > 0 && (
                                          <CommandGroup key={status} heading={statusLabel[status as keyof typeof statusLabel] || status}>
                                              {sessionList.map(session => (
                                                  <CommandItem
                                                      key={session.id}
                                                      value={session.name}
                                                      onSelect={() => {
                                                          setSelectedSessionId(session.id);
                                                          setIsSessionPopoverOpen(false);
                                                      }}
                                                  >
                                                      <Check className={cn("mr-2 h-4 w-4", selectedSessionId === session.id ? "opacity-100" : "opacity-0")} />
                                                      {session.name}
                                                  </CommandItem>
                                              ))}
                                          </CommandGroup>
                                      )
                                  ))}
                              </CommandGroup>
                          </CommandList>
                      </Command>
                  </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead><Button variant="ghost" className="px-0 hover:bg-transparent" onClick={() => requestSort('studentName')}>Sinh viên {getSortIcon('studentName')}</Button></TableHead>
                        <TableHead><Button variant="ghost" className="px-0 hover:bg-transparent" onClick={() => requestSort('projectTitle')}>Đề tài {getSortIcon('projectTitle')}</Button></TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {filteredRegistrations.length > 0 ? (
                    filteredRegistrations.map((reg) => (
                        <RegistrationRow key={reg.id} registration={reg} sessionMap={sessionMap} onAction={handleActionClick} />
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            Không có sinh viên nào.
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
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
                            <h4 className="font-semibold flex items-center gap-2 text-base"><FileSignature className="h-4 w-4 text-primary" /> Phương pháp & Công nghệ thực hiện</h4>
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
                        <Button variant="destructive" onClick={() => handleProposalAction(selectedRegistration, 'reject')}>Yêu cầu chỉnh sửa</Button>
                        <Button onClick={() => handleProposalAction(selectedRegistration, 'approve')}>Duyệt thuyết minh</Button>
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
    </>
  );
}

    