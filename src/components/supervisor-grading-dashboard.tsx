
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import type { GraduationDefenseSession, DefenseRegistration, Supervisor, Rubric } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle } from './ui/alert';
import { Info, UserCheck, GraduationCap, Briefcase } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { GradingForm, type ProjectGroup } from './grading-form';
import { Separator } from './ui/separator';

interface SupervisorGradingDashboardProps {
  supervisorId: string;
  userRole: 'supervisor' | 'admin';
}

interface SessionWithSupervisedStudents {
    session: GraduationDefenseSession;
    registrations: DefenseRegistration[];
}

function SupervisedStudentsGradingView({
    registrations,
    supervisorGraduationRubric,
    companyInternshipRubric,
    supervisorId,
    sessionId
}: {
    registrations: DefenseRegistration[],
    supervisorGraduationRubric: Rubric | null,
    companyInternshipRubric: Rubric | null,
    supervisorId: string,
    sessionId: string,
}) {
    const [selectedGroupForGrading, setSelectedGroupForGrading] = useState<ProjectGroup | null>(null);
    const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
    const [selectedEvalType, setSelectedEvalType] = useState<'graduation' | 'internship' | null>(null);
    const [isGradingDialogOpen, setIsGradingDialogOpen] = useState(false);

    const projectGroups = useMemo(() => {
        const groups = new Map<string, DefenseRegistration[]>();
        registrations.forEach(reg => {
            const projectKey = reg.projectTitle || `_individual_${reg.id}`;
            if (!groups.has(projectKey)) {
                groups.set(projectKey, []);
            }
            groups.get(projectKey)!.push(reg);
        });

        return Array.from(groups.entries()).map(([projectTitle, students]) => ({
            projectTitle,
            students
        }));
    }, [registrations]);

    const handleGradeGraduationClick = (group: (typeof projectGroups)[0]) => {
        if (!supervisorGraduationRubric) return;
        setSelectedGroupForGrading({
            projectTitle: group.projectTitle,
            students: group.students
        });
        setSelectedRubric(supervisorGraduationRubric);
        setSelectedEvalType('graduation');
        setIsGradingDialogOpen(true);
    };

    const handleGradeInternshipClick = (student: DefenseRegistration) => {
        if (!companyInternshipRubric) return;
        setSelectedGroupForGrading({
            projectTitle: `Thực tập của ${student.studentName}`,
            students: [student]
        });
        setSelectedRubric(companyInternshipRubric);
        setSelectedEvalType('internship');
        setIsGradingDialogOpen(true);
    };

    if (registrations.length === 0) {
        return <p className="text-sm text-muted-foreground px-6 pb-4">Bạn không hướng dẫn sinh viên nào trong đợt này.</p>;
    }
    
    return (
        <>
            <CardContent className="space-y-4">
                 {projectGroups.map((group) => (
                    <div key={group.projectTitle} className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">
                           {group.projectTitle.startsWith('_individual_') ? 'Đề tài cá nhân' : group.projectTitle}
                        </h4>
                        <div className="space-y-3">
                            {group.students.map(student => (
                                <div key={student.id} className="flex items-center justify-between pl-4 border-l-2">
                                    <p className="text-sm">{student.studentName} ({student.studentId})</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!companyInternshipRubric}
                                        onClick={() => handleGradeInternshipClick(student)}
                                    >
                                        <Briefcase className="mr-2 h-4 w-4" />
                                        Chấm TT
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Separator className="my-3"/>
                         <Button
                            className="w-full"
                            variant="secondary"
                            disabled={!supervisorGraduationRubric}
                            onClick={() => handleGradeGraduationClick(group)}
                        >
                            <GraduationCap className="mr-2 h-4 w-4" />
                            Chấm điểm Đồ án Tốt nghiệp cho nhóm
                        </Button>
                    </div>
                ))}
            </CardContent>

             {selectedGroupForGrading && selectedRubric && selectedEvalType && (
                 <Dialog open={isGradingDialogOpen} onOpenChange={setIsGradingDialogOpen}>
                    <DialogContent className="sm:max-w-3xl">
                         <GradingForm 
                            projectGroup={selectedGroupForGrading}
                            rubric={selectedRubric}
                            evaluationType={selectedEvalType}
                            supervisorId={supervisorId}
                            sessionId={sessionId}
                            onFinished={() => setIsGradingDialogOpen(false)}
                         />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

export function SupervisorGradingDashboard({ supervisorId, userRole }: SupervisorGradingDashboardProps) {
  const firestore = useFirestore();

  const sessionsQuery = useMemoFirebase(() => query(collection(firestore, 'graduationDefenseSessions'), where('status', '==', 'ongoing')), [firestore]);
  const { data: allSessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);

  const supervisorDocRef = useMemoFirebase(() => doc(firestore, 'supervisors', supervisorId), [firestore, supervisorId]);
  const { data: supervisorData, isLoading: isLoadingSupervisor } = useDoc<Supervisor>(supervisorDocRef);

  const [supervisedAssignments, setSupervisedAssignments] = useState<SessionWithSupervisedStudents[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

  useEffect(() => {
    if (isLoadingSessions || !allSessions || isLoadingSupervisor) return;

    const fetchAssignments = async () => {
      setIsLoadingAssignments(true);
      const supervisedAssignmentsData: SessionWithSupervisedStudents[] = [];
      const supervisorFullName = supervisorData ? `${supervisorData.firstName} ${supervisorData.lastName}` : null;

      for (const session of allSessions) {
        const registrationsSnapshot = await getDocs(query(collection(firestore, 'defenseRegistrations'), where('sessionId', '==', session.id)));
        const registrations = registrationsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }) as DefenseRegistration);
        
        if(supervisorFullName) {
            const supervisedRegistrations = registrations.filter(
                reg => reg.supervisorName === supervisorFullName && reg.registrationStatus === 'reporting'
            );
            if (supervisedRegistrations.length > 0) {
                supervisedAssignmentsData.push({
                    session,
                    registrations: supervisedRegistrations,
                });
            }
        }
      }
      setSupervisedAssignments(supervisedAssignmentsData);
      setIsLoadingAssignments(false);
    };

    fetchAssignments();
  }, [allSessions, isLoadingSessions, supervisorId, firestore, supervisorData, isLoadingSupervisor]);
  

  const SupervisedSessionAccordionItem = ({ sessionData }: { sessionData: SessionWithSupervisedStudents }) => {
    const { session, registrations } = sessionData;

    const supervisorGradRubricDocRef = useMemoFirebase(() => (session.supervisorGraduationRubricId ? doc(firestore, 'rubrics', session.supervisorGraduationRubricId) : null), [firestore, session.supervisorGraduationRubricId]);
    const { data: supervisorGraduationRubric, isLoading: isLoadingSupGradRubric } = useDoc<Rubric>(supervisorGradRubricDocRef);

    const companyInternRubricDocRef = useMemoFirebase(() => (session.companyInternshipRubricId ? doc(firestore, 'rubrics', session.companyInternshipRubricId) : null), [firestore, session.companyInternshipRubricId]);
    const { data: companyInternshipRubric, isLoading: isLoadingCompInternRubric } = useDoc<Rubric>(companyInternRubricDocRef);
    
     const getRubricName = (rubric: Rubric | null | undefined, isLoading: boolean) => {
        if (isLoading) return 'Đang tải...';
        return rubric ? rubric.name : 'Chưa gán';
    }

    return (
        <AccordionItem key={session.id} value={`supervisor-${session.id}`}>
            <AccordionTrigger>
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold">{session.name}</h3>
                    <Badge>{session.status}</Badge>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Danh sách sinh viên</CardTitle>
                         <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                             <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> GVHD chấm TN: {getRubricName(supervisorGraduationRubric, isLoadingSupGradRubric)}</span>
                            <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> ĐV chấm TT: {getRubricName(companyInternshipRubric, isLoadingCompInternRubric)}</span>
                        </CardDescription>
                    </CardHeader>
                     {(isLoadingSupGradRubric || isLoadingCompInternRubric) ? (
                        <div className="p-6"><Skeleton className="h-20 w-full" /></div>
                    ) : (
                        <SupervisedStudentsGradingView
                            registrations={registrations}
                            supervisorGraduationRubric={supervisorGraduationRubric}
                            companyInternshipRubric={companyInternshipRubric}
                            supervisorId={supervisorId}
                            sessionId={session.id}
                        />
                    )}
                </Card>
            </AccordionContent>
        </AccordionItem>
    );
};

  const isLoading = isLoadingSessions || isLoadingAssignments || isLoadingSupervisor;

  if (isLoading) {
      return (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
      )
  }
  
  if (supervisedAssignments.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Info /> Chưa có sinh viên hướng dẫn</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Bạn hiện không hướng dẫn sinh viên nào trong các đợt báo cáo đang diễn ra.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
        <Accordion type="multiple" defaultValue={supervisedAssignments.map(s => `supervisor-${s.session.id}`)}>
            {supervisedAssignments.map((sessionData) => (
                <SupervisedSessionAccordionItem key={sessionData.session.id} sessionData={sessionData} />
            ))}
        </Accordion>
    </div>
  );
}
