
'use client';

import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { GraduationDefenseSession, DefenseRegistration, Evaluation, DefenseSubCommittee } from '@/lib/types';
import { GradeReportTable } from './grade-report-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { BookCheck } from 'lucide-react';

export function GradeReportDashboard() {
  const firestore = useFirestore();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const sessionsQuery = useMemoFirebase(
    () => collection(firestore, 'graduationDefenseSessions'),
    [firestore]
  );
  const { data: sessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);

  const registrationsQuery = useMemoFirebase(
    () => selectedSessionId ? query(collection(firestore, 'defenseRegistrations'), where('sessionId', '==', selectedSessionId)) : null,
    [firestore, selectedSessionId]
  );
  const { data: registrations, isLoading: isLoadingRegistrations } = useCollection<DefenseRegistration>(registrationsQuery);

  const evaluationsQuery = useMemoFirebase(
    () => selectedSessionId ? query(collection(firestore, 'evaluations'), where('sessionId', '==', selectedSessionId)) : null,
    [firestore, selectedSessionId]
  );
  const { data: evaluations, isLoading: isLoadingEvaluations } = useCollection<Evaluation>(evaluationsQuery);
  
  const subCommitteesQuery = useMemoFirebase(
    () => selectedSessionId ? collection(firestore, `graduationDefenseSessions/${selectedSessionId}/subCommittees`) : null,
    [firestore, selectedSessionId]
  );
  const { data: subCommittees, isLoading: isLoadingSubCommittees } = useCollection<DefenseSubCommittee>(subCommitteesQuery);

  const selectedSession = useMemo(() => {
      return sessions?.find(s => s.id === selectedSessionId) || null;
  }, [sessions, selectedSessionId])

  const isLoading = isLoadingRegistrations || isLoadingEvaluations || isLoadingSubCommittees;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Chọn đợt báo cáo</CardTitle>
          <CardDescription>Chọn một đợt báo cáo để xem bảng điểm chi tiết.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            onValueChange={setSelectedSessionId}
            disabled={isLoadingSessions}
          >
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder={isLoadingSessions ? "Đang tải..." : "Chọn một đợt"} />
            </SelectTrigger>
            <SelectContent>
              {sessions?.map(session => (
                <SelectItem key={session.id} value={session.id}>
                  {session.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedSessionId && (
        isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <GradeReportTable
            session={selectedSession}
            registrations={registrations || []}
            evaluations={evaluations || []}
            subCommittees={subCommittees || []}
          />
        )
      )}

      {!selectedSessionId && !isLoadingSessions && (
        <Alert>
            <BookCheck className="h-4 w-4" />
            <AlertTitle>Chưa chọn đợt báo cáo</AlertTitle>
            <AlertDescription>Vui lòng chọn một đợt từ danh sách ở trên để bắt đầu xem điểm.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
