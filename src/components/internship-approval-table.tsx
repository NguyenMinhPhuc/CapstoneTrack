
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { MoreHorizontal, Search, Check, X, Link as LinkIcon, FileUp } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import type { GraduationDefenseSession, DefenseRegistration, InternshipRegistrationStatus, ReportStatus } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RejectionReasonDialog } from './rejection-reason-dialog';
import { Checkbox } from './ui/checkbox';

const registrationStatusLabel: Record<InternshipRegistrationStatus, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Bị từ chối',
};

const registrationStatusVariant: Record<InternshipRegistrationStatus, 'secondary' | 'default' | 'destructive'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

const reportStatusLabel: Record<ReportStatus, string> = {
    reporting: 'Báo cáo',
    exempted: 'Đặc cách',
    withdrawn: 'Bỏ báo cáo',
    not_reporting: 'Chưa ĐK',
    completed: 'Hoàn thành',
};

const reportStatusVariant: Record<ReportStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    reporting: 'default',
    exempted: 'secondary',
    withdrawn: 'destructive',
    not_reporting: 'outline',
    completed: 'default',
};

const statusLabel: Record<string, string> = {
  ongoing: 'Đang diễn ra',
  upcoming: 'Sắp diễn ra',
  completed: 'Đã hoàn thành',
};


export function InternshipApprovalTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('all');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<DefenseRegistration | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  const sessionsQuery = useMemoFirebase(
    () => collection(firestore, 'graduationDefenseSessions'),
    [firestore]
  );
  const { data: sessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);

  const registrationsQuery = useMemoFirebase(
    () => query(
      collection(firestore, 'defenseRegistrations'),
      where('internship_companyName', '!=', null)
    ),
    [firestore]
  );
  const { data: registrations, isLoading: isLoadingRegistrations } = useCollection<DefenseRegistration>(registrationsQuery);

  useEffect(() => {
    setSelectedRowIds([]);
  }, [registrations]);

  const isLoading = isLoadingSessions || isLoadingRegistrations;

  const sessionMap = useMemo(() => {
    if (!sessions) return new Map();
    return new Map(sessions.map(s => [s.id, s.name]));
  }, [sessions]);
  
  const groupedSessions = useMemo(() => {
    if (!sessions) return { ongoing: [], upcoming: [], completed: [] };
    return sessions.reduce((acc, session) => {
      const group = acc[session.status] || [];
      group.push(session);
      acc[session.status] = group;
      return acc;
    }, {} as Record<GraduationDefenseSession['status'], GraduationDefenseSession[]>);
  }, [sessions]);

  const filteredRegistrations = useMemo(() => {
    if (!registrations) return [];
    
    return registrations.filter(reg => {
      const sessionMatch = selectedSessionId === 'all' || reg.sessionId === selectedSessionId;
      const term = searchTerm.toLowerCase();
      const searchMatch = reg.studentName.toLowerCase().includes(term) ||
                          reg.studentId.toLowerCase().includes(term) ||
                          reg.internship_companyName?.toLowerCase().includes(term);

      return sessionMatch && searchMatch;
    });

  }, [registrations, selectedSessionId, searchTerm]);

  const handleStatusChange = async (registrationId: string, newStatus: InternshipRegistrationStatus, reason?: string) => {
    const registrationDocRef = doc(firestore, 'defenseRegistrations', registrationId);
    
    const dataToUpdate: Partial<DefenseRegistration> = { 
        internshipRegistrationStatus: newStatus,
        internshipStatusNote: newStatus === 'rejected' ? reason : '',
     };
    
    updateDoc(registrationDocRef, dataToUpdate)
      .then(() => {
        toast({
          title: 'Thành công',
          description: `Đã cập nhật trạng thái đăng ký.`,
        });
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: registrationDocRef.path,
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', contextualError);
      });
  };

  const handleConfirmReporting = async () => {
    if (selectedRowIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Chưa chọn sinh viên",
        description: "Vui lòng chọn ít nhất một sinh viên đã được duyệt.",
      });
      return;
    }
    
    const registrationsToUpdate = filteredRegistrations.filter(
        reg => selectedRowIds.includes(reg.id) && reg.internshipRegistrationStatus === 'approved'
    );

     if (registrationsToUpdate.length === 0) {
      toast({
        variant: "destructive",
        title: "Không có sinh viên hợp lệ",
        description: "Chỉ có thể xác nhận báo cáo cho các sinh viên có đăng ký đã được duyệt.",
      });
      return;
    }

    const batch = writeBatch(firestore);
    registrationsToUpdate.forEach(reg => {
        const docRef = doc(firestore, 'defenseRegistrations', reg.id);
        batch.update(docRef, { internshipStatus: 'reporting' });
    });

    try {
        await batch.commit();
        toast({
            title: 'Thành công',
            description: `Đã xác nhận báo cáo cho ${registrationsToUpdate.length} sinh viên.`,
        });
        setSelectedRowIds([]);
    } catch(error) {
        console.error("Error confirming reporting status:", error);
        toast({
            variant: "destructive",
            title: "Lỗi",
            description: "Không thể cập nhật trạng thái báo cáo.",
        });
    }
  }

  const handleRejectClick = (registration: DefenseRegistration) => {
    setSelectedRegistration(registration);
    setIsRejectDialogOpen(true);
  };
  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
        if (checked === true) {
            setSelectedRowIds(filteredRegistrations?.map(c => c.id) || []);
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  const renderLinkCell = (url: string | undefined, tooltip: string) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
             <span className={!url ? 'text-muted-foreground/30' : 'text-primary'}>
                <LinkIcon className="h-4 w-4" />
             </span>
          </TooltipTrigger>
           {url && (
            <TooltipContent side="top">
              <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
                 {tooltip}
                <span className="text-xs text-muted-foreground max-w-xs truncate">{url}</span>
              </a>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  const isAllSelected = filteredRegistrations && selectedRowIds.length > 0 && selectedRowIds.length === filteredRegistrations.length;
  const isSomeSelected = selectedRowIds.length > 0 && (!filteredRegistrations || selectedRowIds.length < filteredRegistrations.length);

  return (
     <>
        <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>Danh sách Đăng ký</CardTitle>
                <CardDescription>
                Xem xét và duyệt các đơn đăng ký thực tập của sinh viên.
                </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                 {selectedRowIds.length > 0 && (
                    <Button onClick={handleConfirmReporting} size="sm">
                        <FileUp className="mr-2 h-4 w-4" />
                        Xác nhận Báo cáo ({selectedRowIds.length})
                    </Button>
                )}
                <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm sinh viên, công ty..."
                    className="pl-8 w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
                <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                  <SelectTrigger className="w-full sm:w-[250px]">
                    <SelectValue placeholder="Lọc theo đợt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả các đợt</SelectItem>
                    {Object.entries(groupedSessions).map(([status, sessionList]) =>
                      sessionList.length > 0 && (
                        <SelectGroup key={status}>
                          <SelectLabel>{statusLabel[status] || status}</SelectLabel>
                          {sessionList.map(session => (
                            <SelectItem key={session.id} value={session.id}>
                              {session.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )
                    )}
                  </SelectContent>
                </Select>
            </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="overflow-auto rounded-md border max-h-[65vh]">
            <Table>
                <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                     <TableHead className="w-[50px]">
                        <Checkbox
                            checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                            onCheckedChange={handleSelectAll}
                        />
                    </TableHead>
                    <TableHead>STT</TableHead>
                    <TableHead>Sinh viên</TableHead>
                    <TableHead>Công ty</TableHead>
                    <TableHead>Đợt báo cáo</TableHead>
                    <TableHead>Trạng thái ĐK</TableHead>
                    <TableHead>Trạng thái BC</TableHead>
                    <TableHead className="text-center">Minh chứng</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredRegistrations.length > 0 ? (
                    filteredRegistrations.map((reg, index) => (
                    <TableRow key={reg.id} data-state={selectedRowIds.includes(reg.id) && "selected"}>
                        <TableCell>
                            <Checkbox
                                checked={selectedRowIds.includes(reg.id)}
                                onCheckedChange={(checked) => handleRowSelect(reg.id, !!checked)}
                            />
                        </TableCell>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                        <div>{reg.studentName}</div>
                        <div className="text-xs text-muted-foreground">{reg.studentId}</div>
                        </TableCell>
                        <TableCell>{reg.internship_companyName}</TableCell>
                        <TableCell>{sessionMap.get(reg.sessionId)}</TableCell>
                        <TableCell>
                            <Badge variant={registrationStatusVariant[reg.internshipRegistrationStatus || 'pending']}>
                                {registrationStatusLabel[reg.internshipRegistrationStatus || 'pending']}
                            </Badge>
                        </TableCell>
                         <TableCell>
                            <Badge variant={reportStatusVariant[reg.internshipStatus || 'not_reporting']}>
                                {reportStatusLabel[reg.internshipStatus || 'not_reporting']}
                            </Badge>
                        </TableCell>
                        <TableCell>
                             <div className="flex justify-center items-center gap-4">
                                {renderLinkCell(reg.internship_registrationFormLink, "Đơn đăng ký")}
                                {renderLinkCell(reg.internship_acceptanceLetterLink, "Giấy tiếp nhận")}
                                {renderLinkCell(reg.internship_commitmentFormLink, "Đơn cam kết")}
                                {renderLinkCell(reg.internship_reportLink, "Báo cáo thực tập")}
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
                            <DropdownMenuItem onClick={() => handleStatusChange(reg.id, 'approved')} disabled={reg.internshipRegistrationStatus === 'approved'}>
                                <Check className="mr-2 h-4 w-4" />
                                Duyệt
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleRejectClick(reg); }} disabled={reg.internshipRegistrationStatus === 'rejected'}>
                                <X className="mr-2 h-4 w-4" />
                                Từ chối
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                        Không có đơn đăng ký thực tập nào cần duyệt.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </div>
        </CardContent>
        </Card>
         <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
            <DialogContent>
                 {selectedRegistration && (
                    <RejectionReasonDialog
                        registration={selectedRegistration}
                        onConfirm={(reason) => {
                            handleStatusChange(selectedRegistration.id, 'rejected', reason);
                            setIsRejectDialogOpen(false);
                            setSelectedRegistration(null);
                        }}
                        onCancel={() => {
                             setIsRejectDialogOpen(false);
                            setSelectedRegistration(null);
                        }}
                    />
                 )}
            </DialogContent>
        </Dialog>
    </>
  );
}
