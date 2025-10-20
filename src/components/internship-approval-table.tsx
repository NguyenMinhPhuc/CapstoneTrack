
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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { MoreHorizontal, Search, Check, X, Link as LinkIcon } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, updateDoc, query, where } from 'firebase/firestore';
import type { GraduationDefenseSession, DefenseRegistration, InternshipRegistrationStatus } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from './ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RejectionReasonDialog } from './rejection-reason-dialog';

const statusLabel: Record<InternshipRegistrationStatus, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Bị từ chối',
};

const statusVariant: Record<InternshipRegistrationStatus, 'secondary' | 'default' | 'destructive'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

export function InternshipApprovalTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('all');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<DefenseRegistration | null>(null);

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

  const isLoading = isLoadingSessions || isLoadingRegistrations;

  const sessionMap = useMemo(() => {
    if (!sessions) return new Map();
    return new Map(sessions.map(s => [s.id, s.name]));
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

  const handleRejectClick = (registration: DefenseRegistration) => {
    setSelectedRegistration(registration);
    setIsRejectDialogOpen(true);
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
  
  const renderLinkCell = (url: string | undefined) => {
    if (!url) return <span className="text-muted-foreground">-</span>;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              <LinkIcon className="h-4 w-4" />
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-sm">{url}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };


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
                    {sessions?.map(session => (
                    <SelectItem key={session.id} value={session.id}>{session.name}</SelectItem>
                    ))}
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
                    <TableHead>Sinh viên</TableHead>
                    <TableHead>Công ty</TableHead>
                    <TableHead>Đợt báo cáo</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-center">Minh chứng</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredRegistrations.length > 0 ? (
                    filteredRegistrations.map((reg) => (
                    <TableRow key={reg.id}>
                        <TableCell>
                        <div>{reg.studentName}</div>
                        <div className="text-xs text-muted-foreground">{reg.studentId}</div>
                        </TableCell>
                        <TableCell>{reg.internship_companyName}</TableCell>
                        <TableCell>{sessionMap.get(reg.sessionId)}</TableCell>
                        <TableCell>
                            <Badge variant={statusVariant[reg.internshipRegistrationStatus || 'pending']}>
                                {statusLabel[reg.internshipRegistrationStatus || 'pending']}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <div className="flex justify-center items-center gap-4">
                                {renderLinkCell(reg.internship_registrationFormLink)}
                                {renderLinkCell(reg.internship_acceptanceLetterLink)}
                                {renderLinkCell(reg.internship_commitmentFormLink)}
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
                    <TableCell colSpan={6} className="h-24 text-center">
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
