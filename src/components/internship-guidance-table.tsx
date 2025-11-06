
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, FileUp, Check, X } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, Query, doc, updateDoc } from 'firebase/firestore';
import type { DefenseRegistration, GraduationDefenseSession, InternshipRegistrationStatus, ReportStatus } from '@/lib/types';
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
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from './ui/dialog';
import { RejectionReasonDialog } from './rejection-reason-dialog';
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


interface InternshipGuidanceTableProps {
  supervisorId: string;
  userRole: 'admin' | 'supervisor';
}

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
    not_yet_reporting: 'Chưa báo cáo',
    not_reporting: 'Chưa ĐK',
    completed: 'Hoàn thành',
};

const reportStatusVariant: Record<ReportStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    reporting: 'default',
    exempted: 'secondary',
    not_yet_reporting: 'outline',
    not_reporting: 'outline',
    completed: 'default',
};

const statusLabel: Record<string, string> = {
  ongoing: 'Đang diễn ra',
  upcoming: 'Sắp diễn ra',
  completed: 'Đã hoàn thành',
};

export function InternshipGuidanceTable({ supervisorId, userRole }: InternshipGuidanceTableProps) {
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
  
  useEffect(() => {
    if (sessions && selectedSessionId === 'all') {
      const ongoingSession = sessions.find(s => s.status === 'ongoing');
      if (ongoingSession) {
        setSelectedSessionId(ongoingSession.id);
      }
    }
  }, [sessions, selectedSessionId]);


  const registrationsQuery = useMemoFirebase(() => {
    let q: Query = collection(firestore, 'defenseRegistrations');
    
    const conditions = [];

    if (userRole === 'supervisor') {
        conditions.push(where('internshipSupervisorId', '==', supervisorId));
    }
    
    if (selectedSessionId !== 'all') {
      conditions.push(where('sessionId', '==', selectedSessionId));
    }
    
    return query(q, ...conditions);
  }, [firestore, supervisorId, selectedSessionId, userRole]);

  const { data: registrations, isLoading: isLoadingRegistrations } = useCollection<DefenseRegistration>(registrationsQuery);

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
      // Only show registrations that have an internship company, meaning they have at least started the process.
      if (!reg.internship_companyName) return false;

      const term = searchTerm.toLowerCase();
      const searchMatch = reg.studentName.toLowerCase().includes(term) ||
                          reg.studentId.toLowerCase().includes(term) ||
                          (reg.internship_companyName && reg.internship_companyName.toLowerCase().includes(term));
      return searchMatch;
    });

  }, [registrations, searchTerm]);

  const handleStatusChange = async (registrationId: string, newStatus: InternshipRegistrationStatus, reason?: string) => {
    const registrationDocRef = doc(firestore, 'defenseRegistrations', registrationId);
    
    const dataToUpdate: Partial<DefenseRegistration> = { 
        internshipRegistrationStatus: newStatus,
        internshipStatusNote: newStatus === 'rejected' ? reason : '',
     };

    if (newStatus === 'approved') {
        dataToUpdate.internshipStatus = 'not_yet_reporting';
    }
    
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

  const handleReportStatusChange = async (registrationId: string, newStatus: ReportStatus) => {
    const registrationDocRef = doc(firestore, 'defenseRegistrations', registrationId);
    try {
      await updateDoc(registrationDocRef, { internshipStatus: newStatus });
      toast({
        title: 'Thành công',
        description: `Trạng thái báo cáo của sinh viên đã được cập nhật.`,
      });
    } catch (error) {
      console.error("Error updating report status:", error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái báo cáo.',
      });
    }
  };

  const handleRejectClick = (registration: DefenseRegistration) => {
    setSelectedRegistration(registration);
    setIsRejectDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Danh sách Sinh viên</CardTitle>
              <CardDescription>
                Các sinh viên đang thực tập tại doanh nghiệp bạn được phân công hướng dẫn.
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
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>STT</TableHead>
                  <TableHead>Sinh viên</TableHead>
                  <TableHead>Công ty Thực tập</TableHead>
                  <TableHead>Đợt báo cáo</TableHead>
                  <TableHead>Trạng thái ĐK</TableHead>
                   <TableHead>Trạng thái BC</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.length > 0 ? (
                  filteredRegistrations.map((reg, index) => (
                    <TableRow key={reg.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div>{reg.studentName}</div>
                        <div className="text-xs text-muted-foreground">{reg.studentId}</div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{reg.internship_companyName || 'Chưa có'}</TableCell>
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
                      <TableCell className="text-right">
                         {(reg.internshipRegistrationStatus === 'pending' || reg.internshipRegistrationStatus === 'rejected') ? (
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleStatusChange(reg.id, 'approved')}>
                                    <Check className="mr-2 h-4 w-4" /> Duyệt
                                </Button>
                                {reg.internshipRegistrationStatus !== 'rejected' && (
                                    <Button size="sm" variant="destructive" onClick={() => handleRejectClick(reg)}>
                                        <X className="mr-2 h-4 w-4" /> Từ chối
                                    </Button>
                                )}
                            </div>
                         ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href="/supervisor-grading"><FileUp className="mr-2 h-4 w-4" /> Chấm điểm</Link>
                                </DropdownMenuItem>
                                {userRole === 'admin' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleReportStatusChange(reg.id, 'reporting')} disabled={reg.internshipStatus === 'reporting'}>
                                        Xác nhận Báo cáo
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => handleReportStatusChange(reg.id, 'completed')} disabled={reg.internshipStatus === 'completed'}>
                                        Đánh dấu Hoàn thành
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleReportStatusChange(reg.id, 'not_yet_reporting')} disabled={reg.internshipStatus === 'not_yet_reporting'}>
                                        Chuyển sang 'Chưa báo cáo'
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleRejectClick(reg); }}>
                                    <X className="mr-2 h-4 w-4" /> Yêu cầu sửa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                         )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Không có sinh viên nào.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
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
