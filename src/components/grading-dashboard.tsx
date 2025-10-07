'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { GraduationDefenseSession, DefenseCouncilMember, DefenseSubCommittee, Rubric } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ClipboardCheck, Info } from 'lucide-react';
import { Badge } from './ui/badge';

interface GradingDashboardProps {
  supervisorId: string;
  userRole: 'supervisor' | 'admin';
}

interface SessionWithAssignments {
  session: GraduationDefenseSession;
  isCouncilMember: boolean;
  subCommittees: DefenseSubCommittee[];
}

export function GradingDashboard({ supervisorId, userRole }: GradingDashboardProps) {
  const firestore = useFirestore();

  const sessionsQuery = useMemoFirebase(() => query(collection(firestore, 'graduationDefenseSessions')), [firestore]);
  const { data: allSessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);

  const [assignedSessions, setAssignedSessions] = useState<SessionWithAssignments[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

  useEffect(() => {
    if (isLoadingSessions || !allSessions) return;

    const fetchAssignments = async () => {
      setIsLoadingAssignments(true);
      const assignments: SessionWithAssignments[] = [];

      for (const session of allSessions) {
        let isCouncilMember = false;
        const assignedSubCommittees: DefenseSubCommittee[] = [];

        // Fetch and check main council
        const councilQuery = query(collection(firestore, `graduationDefenseSessions/${session.id}/council`), where('supervisorId', '==', supervisorId));
        const councilSnapshot = await collection(firestore, `graduationDefenseSessions/${session.id}/council`).get();
        if (!councilSnapshot.empty) {
          const members = councilSnapshot.docs.map(d => d.data() as DefenseCouncilMember);
          if (members.some(m => m.supervisorId === supervisorId)) {
            isCouncilMember = true;
          }
        }
        
        // Fetch and check subcommittees
        const subCommitteesSnapshot = await collection(firestore, `graduationDefenseSessions/${session.id}/subCommittees`).get();
        if (!subCommitteesSnapshot.empty) {
          subCommitteesSnapshot.forEach(doc => {
            const sc = { id: doc.id, ...doc.data() } as DefenseSubCommittee;
            if (sc.members.some(m => m.supervisorId === supervisorId)) {
              assignedSubCommittees.push(sc);
            }
          });
        }
        
        // If supervisor is part of this session, add it to the list
        if (isCouncilMember || assignedSubCommittees.length > 0) {
          assignments.push({
            session,
            isCouncilMember,
            subCommittees: assignedSubCommittees,
          });
        }
      }
      setAssignedSessions(assignments);
      setIsLoadingAssignments(false);
    };

    fetchAssignments();
  }, [allSessions, isLoadingSessions, supervisorId, firestore]);

  const isLoading = isLoadingSessions || isLoadingAssignments;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck />
            Phiếu Chấm Điểm
          </CardTitle>
          <CardDescription>
            Đây là danh sách các đợt báo cáo và tiểu ban mà bạn được phân công chấm điểm.
          </CardDescription>
        </CardHeader>
      </Card>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : assignedSessions.length > 0 ? (
        <Accordion type="multiple" defaultValue={assignedSessions.map(s => s.session.id)}>
          {assignedSessions.map(({ session, isCouncilMember, subCommittees }) => (
            <AccordionItem key={session.id} value={session.id}>
              <AccordionTrigger>
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold">{session.name}</h3>
                  <Badge>{session.status}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                {isCouncilMember && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Hội đồng chính</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <p className="text-sm text-muted-foreground">Chức năng chấm điểm cho hội đồng chính sẽ được triển khai.</p>
                        </CardContent>
                    </Card>
                )}
                 {subCommittees.map(sc => (
                    <Card key={sc.id}>
                        <CardHeader>
                            <CardTitle className="text-base">{sc.name}</CardTitle>
                            <CardDescription>{sc.members.length} thành viên</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Danh sách sinh viên cần chấm điểm cho tiểu ban này sẽ hiển thị ở đây.</p>
                        </CardContent>
                    </Card>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Chưa được phân công</AlertTitle>
          <AlertDescription>
            Bạn hiện chưa được phân công vào bất kỳ hội đồng hoặc tiểu ban chấm điểm nào.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}