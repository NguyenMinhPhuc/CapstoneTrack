
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { GraduationDefenseSession, DefenseCouncilMember, DefenseSubCommittee, Rubric, DefenseRegistration } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ClipboardCheck, Info, Users, FileText } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface GradingDashboardProps {
  supervisorId: string;
  userRole: 'supervisor' | 'admin';
}

interface SessionWithAssignments {
  session: GraduationDefenseSession;
  registrations: DefenseRegistration[];
  isCouncilMember: boolean;
  subCommittees: DefenseSubCommittee[];
}

// A new component to render the list for a single subcommittee
function SubcommitteeGradingView({ subcommittee, registrations }: { subcommittee: DefenseSubCommittee, registrations: DefenseRegistration[] }) {
    const studentsInSubcommittee = useMemo(() => {
        return registrations.filter(reg => reg.subCommitteeId === subcommittee.id && reg.registrationStatus === 'reporting');
    }, [registrations, subcommittee.id]);

    const projectGroups = useMemo(() => {
        const groups = new Map<string, DefenseRegistration[]>();
        studentsInSubcommittee.forEach(reg => {
            const projectKey = reg.projectTitle || `_individual_${reg.id}`;
            if (!groups.has(projectKey)) {
                groups.set(projectKey, []);
            }
            groups.get(projectKey)!.push(reg);
        });
        return Array.from(groups.entries());
    }, [studentsInSubcommittee]);

    if (studentsInSubcommittee.length === 0) {
        return <p className="text-sm text-muted-foreground px-6 pb-4">Không có sinh viên nào được phân công vào tiểu ban này.</p>;
    }

    return (
        <CardContent>
            <div className="space-y-4">
                {projectGroups.map(([projectTitle, students]) => (
                    <div key={projectTitle} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                             <div>
                                <h4 className="font-semibold text-base">
                                    {projectTitle.startsWith('_individual_') ? 'Đề tài cá nhân' : projectTitle}
                                </h4>
                                <div className="mt-2 space-y-1">
                                    {students.map(student => (
                                        <div key={student.id} className="flex items-center gap-2 text-sm">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            <span>{student.studentName} ({student.studentId})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Button variant="outline" size="sm">
                                <ClipboardCheck className="mr-2 h-4 w-4"/>
                                Chấm điểm
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </CardContent>
    )
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

        // Fetch all data in parallel for the current session
        const [councilSnapshot, subCommitteesSnapshot, registrationsSnapshot] = await Promise.all([
            getDocs(collection(firestore, `graduationDefenseSessions/${session.id}/council`)),
            getDocs(collection(firestore, `graduationDefenseSessions/${session.id}/subCommittees`)),
            getDocs(query(collection(firestore, 'defenseRegistrations'), where('sessionId', '==', session.id)))
        ]);
        
        // Process council members
        if (!councilSnapshot.empty) {
          const members = councilSnapshot.docs.map(d => d.data() as DefenseCouncilMember);
          if (members.some(m => m.supervisorId === supervisorId)) {
            isCouncilMember = true;
          }
        }
        
        // Process subcommittees
        if (!subCommitteesSnapshot.empty) {
          subCommitteesSnapshot.forEach(doc => {
            const sc = { id: doc.id, ...doc.data() } as DefenseSubCommittee;
            if (sc.members.some(m => m.supervisorId === supervisorId)) {
              assignedSubCommittees.push(sc);
            }
          });
        }
        
        // Process registrations
        const registrations = registrationsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }) as DefenseRegistration);
        
        // If supervisor is part of this session, add it to the list
        if (isCouncilMember || assignedSubCommittees.length > 0) {
          assignments.push({
            session,
            registrations,
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
          {assignedSessions.map(({ session, isCouncilMember, subCommittees, registrations }) => (
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
                         <SubcommitteeGradingView subcommittee={sc} registrations={registrations} />
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
