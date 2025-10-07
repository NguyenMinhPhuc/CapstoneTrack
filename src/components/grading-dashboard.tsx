
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import type { GraduationDefenseSession, DefenseCouncilMember, DefenseSubCommittee, Rubric, DefenseRegistration, StudentWithRegistrationDetails } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ClipboardCheck, Info, Users, FileText, Book, Target, CheckCircle, Link as LinkIcon, ChevronDown } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogTrigger, DialogContent } from './ui/dialog';
import { GradingForm } from './grading-form';

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

interface ProjectGroup {
    projectTitle: string;
    students: DefenseRegistration[];
    // We pass the first student's details for display, assuming they are the same for the group
    summary?: string;
    objectives?: string;
    expectedResults?: string;
    reportLink?: string;
}

// A new component to render the list for a single subcommittee
function SubcommitteeGradingView({
    subcommittee, 
    registrations,
    rubric,
    supervisorId,
    sessionId
}: { 
    subcommittee: DefenseSubCommittee, 
    registrations: DefenseRegistration[],
    rubric: Rubric | null,
    supervisorId: string,
    sessionId: string,
}) {
    const [selectedGroup, setSelectedGroup] = useState<ProjectGroup | null>(null);
    const [isGradingDialogOpen, setIsGradingDialogOpen] = useState(false);

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
        return Array.from(groups.entries()).map(([projectTitle, students]) => {
            // Find the student with the most complete information to use for display
            const representativeStudent = 
                students.find(s => s.summary && s.objectives) || 
                students.find(s => s.summary) || 
                students[0];

            return {
                projectTitle, 
                students,
                summary: representativeStudent?.summary,
                objectives: representativeStudent?.objectives,
                expectedResults: representativeStudent?.expectedResults,
                reportLink: representativeStudent?.reportLink,
            }
        });
    }, [studentsInSubcommittee]);

    const handleGradeClick = (group: ProjectGroup) => {
        setSelectedGroup(group);
        setIsGradingDialogOpen(true);
    };

    if (studentsInSubcommittee.length === 0) {
        return <p className="text-sm text-muted-foreground px-6 pb-4">Không có sinh viên nào được phân công vào tiểu ban này.</p>;
    }

    return (
        <>
            <CardContent>
                <Accordion type="multiple" className="w-full space-y-4">
                    {projectGroups.map((group) => (
                        <AccordionItem value={group.projectTitle} key={group.projectTitle} className="border rounded-lg px-4 bg-background">
                            <div className="flex items-center">
                                <AccordionTrigger className="hover:no-underline flex-1">
                                    <div className="text-left">
                                        <h4 className="font-semibold text-base">
                                            {group.projectTitle.startsWith('_individual_') ? 'Đề tài cá nhân' : group.projectTitle}
                                        </h4>
                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                            {group.students.map(student => (
                                                <div key={student.id} className="flex items-center gap-2 text-sm">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <span>{student.studentName} ({student.studentId})</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    disabled={!rubric}
                                    onClick={() => handleGradeClick(group)}
                                    className="ml-4"
                                >
                                    <ClipboardCheck className="mr-2 h-4 w-4"/>
                                    {rubric ? 'Chấm điểm' : 'Chưa có Rubric'}
                                </Button>
                            </div>
                            <AccordionContent>
                                <div className="space-y-4 pt-2 border-t mt-2">
                                     <div className="space-y-2">
                                        <h5 className="font-semibold flex items-center gap-2"><Book className="h-4 w-4 text-primary"/>Tóm tắt</h5>
                                        <p className="text-sm text-muted-foreground pl-6">{group.summary || 'Chưa có thông tin.'}</p>
                                     </div>
                                      <div className="space-y-2">
                                        <h5 className="font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-primary"/>Mục tiêu</h5>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">{group.objectives || 'Chưa có thông tin.'}</p>
                                     </div>
                                      <div className="space-y-2">
                                        <h5 className="font-semibold flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary"/>Kết quả mong đợi</h5>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">{group.expectedResults || 'Chưa có thông tin.'}</p>
                                     </div>
                                     {group.reportLink && (
                                        <div className="space-y-2">
                                            <h5 className="font-semibold flex items-center gap-2"><LinkIcon className="h-4 w-4 text-primary"/>Link báo cáo</h5>
                                            <a href={group.reportLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline break-all pl-6">
                                                {group.reportLink}
                                            </a>
                                        </div>
                                     )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
            {selectedGroup && rubric && (
                 <Dialog open={isGradingDialogOpen} onOpenChange={setIsGradingDialogOpen}>
                    <DialogContent className="sm:max-w-3xl">
                         <GradingForm 
                            projectGroup={selectedGroup}
                            rubric={rubric}
                            supervisorId={supervisorId}
                            sessionId={sessionId}
                            onFinished={() => setIsGradingDialogOpen(false)}
                         />
                    </DialogContent>
                </Dialog>
            )}
        </>
    )
}


export function GradingDashboard({ supervisorId, userRole }: GradingDashboardProps) {
  const firestore = useFirestore();

  const sessionsQuery = useMemoFirebase(() => query(collection(firestore, 'graduationDefenseSessions'), where('status', '==', 'ongoing')), [firestore]);
  const { data: allSessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);

  const [assignedSessions, setAssignedSessions] = useState<SessionWithAssignments[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

  useEffect(() => {
    if (isLoadingSessions || !allSessions) return;

    const fetchAssignments = async () => {
      setIsLoadingAssignments(true);
      const assignments: SessionWithAssignments[] = [];

      for (const session of allSessions) {
        // Skip if supervisorId is not yet available for this iteration
        if (!supervisorId) continue;

        let isCouncilMember = false;
        const assignedSubCommittees: DefenseSubCommittee[] = [];

        // Fetch all data in parallel for the current session
        const [councilSnapshot, subCommitteesSnapshot, registrationsSnapshot] = await Promise.all([
            getDocs(collection(firestore, `graduationDefenseSessions/${session.id}/council`)),
            getDocs(collection(firestore, `graduationDefenseSessions/${session.id}/subCommittees`)),
            getDocs(query(collection(firestore, 'defenseRegistrations'), where('sessionId', '==', session.id)))
        ]);
        
        const members = councilSnapshot.docs.map(d => d.data() as DefenseCouncilMember);
        if (members.some(m => m.supervisorId === supervisorId)) {
          isCouncilMember = true;
        }
        
        const subCommittees = subCommitteesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DefenseSubCommittee));
        subCommittees.forEach(sc => {
          if (sc.members.some(m => m.supervisorId === supervisorId)) {
            assignedSubCommittees.push(sc);
          }
        });
        
        const registrations = registrationsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }) as DefenseRegistration);
        
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
  
  
  const SessionAccordionItem = ({ sessionData }: { sessionData: SessionWithAssignments }) => {
    const { session, isCouncilMember, subCommittees, registrations } = sessionData;
    const rubricDocRef = useMemoFirebase(
      () => (session.rubricId ? doc(firestore, 'rubrics', session.rubricId) : null),
      [firestore, session.rubricId]
    );
    const { data: rubric, isLoading: isRubricLoading } = useDoc<Rubric>(rubricDocRef);

    return (
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
                        <CardDescription>
                            {sc.members.length} thành viên - Rubric: {isRubricLoading ? 'Đang tải...' : rubric ? rubric.name : 'Chưa có'}
                        </CardDescription>
                    </CardHeader>
                    {isRubricLoading ? (
                        <div className="p-6"><Skeleton className="h-20 w-full" /></div>
                    ) : (
                         <SubcommitteeGradingView 
                            subcommittee={sc} 
                            registrations={registrations} 
                            rubric={rubric || null}
                            supervisorId={supervisorId}
                            sessionId={session.id}
                        />
                    )}
                </Card>
            ))}
            </AccordionContent>
        </AccordionItem>
    );
  }


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
            Đây là danh sách các đợt báo cáo và tiểu ban đang hoạt động mà bạn được phân công chấm điểm.
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
          {assignedSessions.map((sessionData) => (
            <SessionAccordionItem key={sessionData.session.id} sessionData={sessionData} />
          ))}
        </Accordion>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Chưa được phân công</AlertTitle>
          <AlertDescription>
            Bạn hiện chưa được phân công vào bất kỳ hội đồng hoặc tiểu ban chấm điểm nào trong các đợt đang diễn ra.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
