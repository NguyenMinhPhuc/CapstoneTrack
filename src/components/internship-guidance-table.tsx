
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, FileUp } from 'lucide-react';
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

interface InternshipGuidanceTableProps {
  supervisorId: string;
  userRole: 'admin' | 'supervisor';
}

const registrationStatusLabel: Record<DefenseRegistration['internshipRegistrationStatus'], string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Bị từ chối',
};

const registrationStatusVariant: Record<DefenseRegistration['internshipRegistrationStatus'], 'secondary' | 'default' | 'destructive'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

const statusLabel: Record<string, string> = {
  ongoing: 'Đang diễn ra',
  upcoming: 'Sắp diễn ra',
  completed: 'Đã hoàn thành',
};

export function InternshipGuidanceTable({ supervisorId, userRole }: InternshipGuidanceTableProps) {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('all');

  const sessionsQuery = useMemoFirebase(
    () => collection(firestore, 'graduationDefenseSessions'),
    [firestore]
  );
  const { data: sessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);

  const registrationsQuery = useMemoFirebase(() => {
    let q: Query = collection(firestore, 'defenseRegistrations');
    
    if (userRole === 'supervisor') {
        q = query(q, where('internshipSupervisorId', '==', supervisorId));
    }
    
    q = query(q, where('internshipStatus', '==', 'reporting'));

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

  const filteredRegistrations = useMemo(() => {
    if (!registrations) return [];
    
    return registrations.filter(reg => {
      const term = searchTerm.toLowerCase();
      const searchMatch = reg.studentName.toLowerCase().includes(term) ||
                          reg.studentId.toLowerCase().includes(term) ||
                          (reg.internship_companyName && reg.internship_companyName.toLowerCase().includes(term));
      return searchMatch;
    });

  }, [registrations, searchTerm]);

  return (
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
                    <TableCell className="text-right">
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
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
