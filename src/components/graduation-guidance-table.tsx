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
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, Eye, FileSignature, FileUp, ArrowUpDown } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, Query } from 'firebase/firestore';
import type { DefenseRegistration, GraduationDefenseSession } from '@/lib/types';
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

const reportStatusLabel: Record<string, string> = {
    not_submitted: 'Chưa nộp',
    pending_approval: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Bị từ chối',
};

const statusLabel: Record<string, string> = {
  ongoing: 'Đang diễn ra',
  upcoming: 'Sắp diễn ra',
  completed: 'Đã hoàn thành',
};

export function GraduationGuidanceTable({ supervisorId, userRole }: GraduationGuidanceTableProps) {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('all');
  const [proposalStatusFilter, setProposalStatusFilter] = useState('all');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);


  const sessionsQuery = useMemoFirebase(
    () => collection(firestore, 'graduationDefenseSessions'),
    [firestore]
  );
  const { data: sessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);

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
    if (!sessions) return { ongoing: [], upcoming: [], completed: [] };
    return sessions.reduce((acc, session) => {
      const group = acc[session.status] || [];
      group.push(session);
      acc[session.status] = group;
      return acc;
    }, {} as Record<GraduationDefenseSession['status'], GraduationDefenseSession[]>);
  }, [sessions]);

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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm sinh viên, đề tài..."
                className="pl-8 w-full sm:w-48"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
                <TableHead>
                    <Button variant="ghost" className="px-0 hover:bg-transparent" onClick={() => requestSort('studentName')}>
                        Sinh viên {getSortIcon('studentName')}
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" className="px-0 hover:bg-transparent" onClick={() => requestSort('projectTitle')}>
                        Đề tài {getSortIcon('projectTitle')}
                    </Button>
                </TableHead>
                <TableHead>Đợt báo cáo</TableHead>
                <TableHead>
                     <Button variant="ghost" className="px-0 hover:bg-transparent" onClick={() => requestSort('proposalStatus')}>
                        TT Thuyết minh {getSortIcon('proposalStatus')}
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" className="px-0 hover:bg-transparent" onClick={() => requestSort('reportStatus')}>
                        TT Báo cáo {getSortIcon('reportStatus')}
                    </Button>
                </TableHead>
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
                    <TableCell className="max-w-xs truncate">{reg.projectTitle}</TableCell>
                    <TableCell>{sessionMap.get(reg.sessionId)}</TableCell>
                    <TableCell>
                      <Badge variant={proposalStatusVariant[reg.proposalStatus || 'not_submitted']}>
                        {proposalStatusLabel[reg.proposalStatus || 'not_submitted']}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={reportStatusVariant[reg.reportStatus || 'not_submitted']}>
                        {reportStatusLabel[reg.reportStatus || 'not_submitted']}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem asChild>
                            <Link href="/my-topics"><Eye className="mr-2 h-4 w-4" /> Xem chi tiết</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/supervisor-grading"><FileSignature className="mr-2 h-4 w-4" /> Chấm điểm</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
  );
}
