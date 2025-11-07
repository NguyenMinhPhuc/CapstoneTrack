
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, Eye, FileSignature, FileUp, ArrowUpDown, Activity, Book, Target, CheckCircle, Link as LinkIcon, ChevronDown } from 'lucide-react';
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
import Link from 'next/link';
import { Button } from './ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { ViewProgressDialog } from './view-progress-dialog';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
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

export function GraduationGuidanceTable({ supervisorId, userRole }: GraduationGuidanceTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('all');
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
    return sessions.filter(s => s.sessionType !== 'internship');
  }, [sessions]);

  const registrationsQuery = useMemoFirebase(() => {
    let q: Query = collection(firestore, 'defenseRegistrations');
    
    if (userRole === 'supervisor') {
        q = query(q, where('supervisorId', '==', supervisorId));
    }
    
    q = query(q, where('graduationStatus', '==', 'reporting'));

    if (selectedSessionId !== 'all') {
      q = query(q, where('sessionId', '==', selectedSessionId));
    }
    
    return q;
  }, [firestore, supervisorId, selectedSessionId, userRole]);

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
    return sortConfig.direction === 'asc' ? <ArrowUpDown className="ml-2 h-4 w-4" /> : <ArrowUpDown className="ml-2 h-4 w-4" />;
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
    }
  }

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
                          {selectedSessionId === 'all'
                              ? "Tất cả các đợt"
                              : sessionMap.get(selectedSessionId) || "Chọn đợt..."}
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
            <div className="border rounded-md">
              <div className="flex w-full text-left text-sm font-semibold items-center bg-muted/50 px-4">
                <div className="w-1/12 py-3">STT</div>
                <div className="w-5/12 py-3">Sinh viên</div>
                <div className="w-4/12 py-3">Trạng thái</div>
                <div className="w-2/12 py-3 text-right">Hành động</div>
              </div>
               <Accordion type="multiple" className="w-full">
                {filteredRegistrations.length > 0 ? (
                  filteredRegistrations.map((reg, index) => (
                    <AccordionItem value={reg.id} key={reg.id} className="border-b">
                      <div className="flex items-center px-4 hover:bg-muted/50">
                        <div className="w-1/12">{index + 1}</div>
                        <AccordionTrigger className="w-5/12 py-4 text-left font-medium hover:no-underline">
                            <div>
                                <div>{reg.studentName}</div>
                                <div className="text-xs text-muted-foreground">{reg.studentId}</div>
                            </div>
                        </AccordionTrigger>
                        <div className="w-4/12 flex flex-col items-start gap-1">
                          <Badge variant={proposalStatusVariant[reg.proposalStatus || 'not_submitted']}>{proposalStatusLabel[reg.proposalStatus || 'not_submitted']}</Badge>
                          <Badge variant={reportStatusVariant[reg.reportStatus || 'not_submitted']}>{reportStatusLabel[reg.reportStatus || 'not_submitted']}</Badge>
                        </div>
                        <div className="w-2/12 flex justify-end">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewProgressClick(reg)}><Activity className="mr-2 h-4 w-4" /> Xem tiến độ</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewProposalClick(reg)} disabled={!reg.proposalStatus || reg.proposalStatus === 'not_submitted'}><Eye className="mr-2 h-4 w-4" /> Xem thuyết minh</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewReportClick(reg)} disabled={!reg.reportStatus || reg.reportStatus === 'not_submitted'}><Eye className="mr-2 h-4 w-4" /> Xem báo cáo</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                      </div>
                       <AccordionContent>
                            <div className="p-4 bg-muted/30 border-t space-y-4">
                               <div className="space-y-1"><h4 className="font-semibold text-base">{reg.projectTitle || "Chưa có tên đề tài"}</h4></div>
                               <div className="space-y-1"><h4 className="font-semibold flex items-center gap-2 text-base"><Book className="h-4 w-4 text-primary" /> Tóm tắt</h4><div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"><ReactMarkdown remarkPlugins={[remarkGfm]}>{reg.summary || ''}</ReactMarkdown></div></div>
                                <div className="space-y-1"><h4 className="font-semibold flex items-center gap-2 text-base"><Target className="h-4 w-4 text-primary" /> Mục tiêu</h4><div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"><ReactMarkdown remarkPlugins={[remarkGfm]}>{reg.objectives || ''}</ReactMarkdown></div></div>
                                <div className="space-y-1"><h4 className="font-semibold flex items-center gap-2 text-base"><CheckCircle className="h-4 w-4 text-primary" /> Kết quả mong đợi</h4><div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"><ReactMarkdown remarkPlugins={[remarkGfm]}>{reg.expectedResults || ''}</ReactMarkdown></div></div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground col-span-12">
                    Không có sinh viên nào phù hợp.
                  </div>
                )}
               </Accordion>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Dialog for viewing proposal */}
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
      {/* Dialog for viewing report */}
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
       {/* Dialog for viewing progress */}
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
