
'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useUser, useCollection, useMemoFirebase, useFirestore } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { DefenseRegistration, GraduationDefenseSession } from "@/lib/types";
import { Skeleton } from './ui/skeleton';
import Link from 'next/link';

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

export function SupervisorDashboardTable() {
  const { user } = useUser();
  const firestore = useFirestore();

  const sessionsQuery = useMemoFirebase(
    () => query(collection(firestore, 'graduationDefenseSessions'), where('status', '==', 'ongoing')),
    [firestore]
  );
  const { data: ongoingSessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);

  const registrationsQuery = useMemoFirebase(() => {
    if (!user || !ongoingSessions || ongoingSessions.length === 0) return null;
    const ongoingSessionIds = ongoingSessions.map(s => s.id);
    return query(
      collection(firestore, 'defenseRegistrations'),
      where('supervisorId', '==', user.uid),
      where('sessionId', 'in', ongoingSessionIds),
      where('graduationStatus', '==', 'reporting')
    );
  }, [firestore, user, ongoingSessions]);
  
  const { data: registrations, isLoading: isLoadingRegs } = useCollection<DefenseRegistration>(registrationsQuery);
  
  const isLoading = isLoadingSessions || isLoadingRegs;

  const sessionMap = useMemo(() => {
    if (!ongoingSessions) return new Map();
    return new Map(ongoingSessions.map(session => [session.id, session.name]));
  }, [ongoingSessions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sinh viên đang hướng dẫn tốt nghiệp</CardTitle>
        <CardDescription>
          Danh sách sinh viên bạn đang hướng dẫn đồ án tốt nghiệp trong các đợt đang diễn ra.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
             <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sinh viên</TableHead>
                <TableHead>Đề tài</TableHead>
                <TableHead>Đợt báo cáo</TableHead>
                <TableHead>Trạng thái thuyết minh</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations && registrations.length > 0 ? (
                registrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell>
                      <div className="font-medium">{reg.studentName}</div>
                      <div className="text-sm text-muted-foreground">{reg.studentId}</div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{reg.projectTitle}</TableCell>
                    <TableCell>{sessionMap.get(reg.sessionId)}</TableCell>
                    <TableCell>
                      <Badge variant={proposalStatusVariant[reg.proposalStatus || 'not_submitted']}>
                        {proposalStatusLabel[reg.proposalStatus || 'not_submitted']}
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
                            <Link href="/my-topics">Xem chi tiết</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/supervisor-grading">Chấm điểm</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        Bạn hiện không hướng dẫn sinh viên tốt nghiệp nào trong các đợt đang diễn ra.
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
