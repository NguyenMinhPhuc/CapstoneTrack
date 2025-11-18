
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, getDocs, doc, Query, DocumentData } from 'firebase/firestore';
import type { GraduationDefenseSession, DefenseRegistration, Supervisor, Rubric, Evaluation } from '@/lib/types';
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

interface SessionAssignments {
  session: GraduationDefenseSession;
  graduationRegistrations: DefenseRegistration[];
  internshipRegistrations: DefenseRegistration[];
}

function GraduationGradingView({
    registrations,
    rubric,
    evaluations,
    supervisorId,
    sessionId,
}: {
    registrations: DefenseRegistration[];
    rubric: Rubric | null;
    evaluations: Evaluation[];
    supervisorId: string;
    sessionId: string;
}) {
    const [selectedGroup, setSelectedGroup] = useState<ProjectGroup | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [existingEvaluation, setExistingEvaluation] = useState<Evaluation | null>(null);


    const projectGroups = useMemo(() => {
        // Only include students whose final report has been approved
        const groups = new Map<string, DefenseRegistration[]>();
        registrations.forEach(reg => {
            if (reg.reportStatus === 'approved') {
                const projectKey = reg.projectTitle || `_individual_${reg.id}`;
                if (!groups.has(projectKey)) groups.set(projectKey, []);
                groups.get(projectKey)!.push(reg);
            }
        });
        return Array.from(groups.entries()).map(([projectTitle, students]) => ({ projectTitle, students }));
    }, [registrations]);

    const getEvaluationForGroup = (group: ProjectGroup) => {
        const studentId = group.students[0].id;
        return evaluations.find(e => 
            e.registrationId === studentId && 
            e.evaluationType === 'graduation' &&
            e.evaluatorId === supervisorId &&
            e.rubricId === rubric?.id
        );
    }

    const handleGradeClick = (group: ProjectGroup) => {
        if (!rubric) return;
        setExistingEvaluation(getEvaluationForGroup(group) || null);
        setSelectedGroup(group);
        setIsDialogOpen(true);
    };

    if (projectGroups.length === 0) {
        return <p className="text-sm text-muted-foreground px-6 pb-4">Chưa có sinh viên nào có báo cáo đã được duyệt để chấm điểm.</p>;
    }

    return (
        <>
            <CardContent className="space-y-4">
                {projectGroups.map(group => {
                    const evaluation = getEvaluationForGroup(group);
                    return (
                        <div key={group.projectTitle} className="border rounded-lg p-4 flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold">{group.projectTitle.startsWith('_individual_') ? 'Đề tài cá nhân' : group.projectTitle}</h4>
                                <div className="text-xs text-muted-foreground">
                                    {group.students.map(s => `${s.studentName} (${s.studentId})`).join(', ')}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {evaluation && (
                                    <Badge variant="secondary" className="border-green-600/50 bg-green-50 text-green-700">
                                        {evaluation.totalScore.toFixed(2)}
                                    </Badge>
                                )}
                                <Button className="w-32" variant="outline" disabled={!rubric} onClick={() => handleGradeClick(group)}>
                                    {evaluation ? 'Sửa điểm' : 'Chấm điểm'}
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </CardContent>
            {selectedGroup && rubric && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-3xl">
                        <GradingForm 
                            projectGroup={selectedGroup}
                            rubric={rubric}
                            evaluationType="graduation"
                            supervisorId={supervisorId}
                            sessionId={sessionId}
                            onFinished={() => setIsDialogOpen(false)}
                            existingEvaluation={existingEvaluation}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

// Component for grading Internships
function InternshipGradingView({
    registrations,
    rubric,
    evaluations,
    supervisorId,
    sessionId,
}: {
    registrations: DefenseRegistration[];
    rubric: Rubric | null;
    evaluations: Evaluation[];
    supervisorId: string;
    sessionId: string;
}) {
    const [selectedStudent, setSelectedStudent] = useState<DefenseRegistration | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [existingEvaluation, setExistingEvaluation] = useState<Evaluation | null>(null);
    
    // Only show students who are in 'reporting' status
    const validRegistrations = useMemo(() => {
        return registrations.filter(reg => reg.internshipStatus === 'reporting');
    }, [registrations]);

    const getEvaluationForInternship = (student: DefenseRegistration) => {
        return evaluations.find(e => 
            e.registrationId === student.id &&
            e.evaluationType === 'internship' &&
            e.evaluatorId === supervisorId &&
            e.rubricId === rubric?.id
        );
    }

    const handleGradeClick = (student: DefenseRegistration) => {
        if (!rubric) return;
        setExistingEvaluation(getEvaluationForInternship(student) || null);
        setSelectedStudent(student);
        setIsDialogOpen(true);
    };

    if (validRegistrations.length === 0) {
        return <p className="text-sm text-muted-foreground px-6 pb-4">Không có sinh viên nào đang ở trạng thái báo cáo để chấm điểm.</p>;
    }

    return (
        <>
            <CardContent className="space-y-4">
                {validRegistrations.map(student => {
                    const evaluation = getEvaluationForInternship(student);
                    return (
                        <div key={student.id} className="border rounded-lg p-4 flex items-center justify-between">
                            <div>
                            <p className="font-semibold">{student.studentName} ({student.studentId})</p>
                            <p className="text-xs text-muted-foreground">ĐVTT: {student.internship_companyName || 'Chưa có thông tin'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {evaluation && (
                                     <Badge variant="secondary" className="border-green-600/50 bg-green-50 text-green-700">
                                        {evaluation.totalScore.toFixed(2)}
                                    </Badge>
                                )}
                                <Button className="w-32" variant="outline" size="sm" disabled={!rubric} onClick={() => handleGradeClick(student)}>
                                    {evaluation ? 'Sửa điểm' : 'Chấm Thực tập'}
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </CardContent>
             {selectedStudent && rubric && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-3xl">
                        <GradingForm 
                            projectGroup={{ projectTitle: `Thực tập của ${selectedStudent.studentName}`, students: [selectedStudent] }}
                            rubric={rubric}
                            evaluationType="internship"
                            supervisorId={supervisorId}
                            sessionId={sessionId}
                            onFinished={() => setIsDialogOpen(false)}
                            existingEvaluation={existingEvaluation}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    )
}

export function SupervisorGradingDashboard({ supervisorId, userRole }: SupervisorGradingDashboardProps) {
  const firestore = useFirestore();

  const sessionsQuery = useMemoFirebase(() => query(collection(firestore, 'graduationDefenseSessions'), where('status', '==', 'ongoing')), [firestore]);
  const { data: allSessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);
  
  const [supervisedAssignments, setSupervisedAssignments] = useState<SessionAssignments[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

  const ongoingSessionIds = useMemo(() => allSessions?.map(s => s.id) || [], [allSessions]);

  const evaluationsQuery = useMemoFirebase(
      () => ongoingSessionIds.length > 0 ? query(collection(firestore, 'evaluations'), where('sessionId', 'in', ongoingSessionIds)) : null,
      [firestore, ongoingSessionIds]
  );
  const { data: allEvaluations, isLoading: isLoadingEvaluations } = useCollection<Evaluation>(evaluationsQuery);

  useEffect(() => {
    if (isLoadingSessions || !allSessions) return;

    const fetchAssignments = async () => {
      setIsLoadingAssignments(true);
      const assignmentsData: SessionAssignments[] = [];

      for (const session of allSessions) {
        
        let gradSupervisorQuery: Query<DocumentData>;
        let internSupervisorQuery: Query<DocumentData>;

        const baseGradQuery = [
            where('sessionId', '==', session.id),
        ];
        const baseInternQuery = [
            where('sessionId', '==', session.id),
        ];

        if (userRole === 'admin') {
            // Admin sees all students in the session
            gradSupervisorQuery = query(collection(firestore, 'defenseRegistrations'), ...baseGradQuery);
            internSupervisorQuery = query(collection(firestore, 'defenseRegistrations'), ...baseInternQuery);
        } else {
            // Supervisor sees only their assigned students
            gradSupervisorQuery = query(collection(firestore, 'defenseRegistrations'), ...baseGradQuery, where('supervisorId', '==', supervisorId));
            internSupervisorQuery = query(collection(firestore, 'defenseRegistrations'), ...baseInternQuery, where('internshipSupervisorId', '==', supervisorId));
        }
        
        const [gradSnapshot, internSnapshot] = await Promise.all([
          getDocs(gradSupervisorQuery),
          getDocs(internSupervisorQuery),
        ]);

        const graduationRegistrations = gradSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as DefenseRegistration);
        const internshipRegistrations = internSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as DefenseRegistration);
        
        if (graduationRegistrations.length > 0 || internshipRegistrations.length > 0) {
            assignmentsData.push({
                session,
                graduationRegistrations,
                internshipRegistrations,
            });
        }
      }
      setSupervisedAssignments(assignmentsData);
      setIsLoadingAssignments(false);
    };

    fetchAssignments();
  }, [allSessions, isLoadingSessions, supervisorId, firestore, userRole]);
  
  
  const SessionAccordionItem = ({ sessionData }: { sessionData: SessionAssignments }) => {
    const { session, graduationRegistrations, internshipRegistrations } = sessionData;

    // Fetch rubrics
    const supGradRubricRef = useMemoFirebase(() => (session.supervisorGraduationRubricId ? doc(firestore, 'rubrics', session.supervisorGraduationRubricId) : null), [firestore, session.supervisorGraduationRubricId]);
    const { data: supervisorGraduationRubric, isLoading: isLoadingSupGradRubric } = useDoc<Rubric>(supGradRubricRef);

    const compInternRubricRef = useMemoFirebase(() => (session.companyInternshipRubricId ? doc(firestore, 'rubrics', session.companyInternshipRubricId) : null), [firestore, session.companyInternshipRubricId]);
    const { data: companyInternshipRubric, isLoading: isLoadingCompInternRubric } = useDoc<Rubric>(compInternRubricRef);

    const sessionEvaluations = useMemo(() => {
        return allEvaluations?.filter(e => e.sessionId === session.id) || [];
    }, [allEvaluations, session.id]);
    
    const getRubricName = (rubric: Rubric | null | undefined, isLoading: boolean) => {
        if (isLoading) return 'Đang tải...';
        return rubric ? rubric.name : 'Chưa gán';
    }

    const isLoadingRubrics = isLoadingSupGradRubric || isLoadingCompInternRubric;

    return (
        <AccordionItem key={session.id} value={`session-${session.id}`}>
            <AccordionTrigger>
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold">{session.name}</h3>
                    <Badge>{session.status}</Badge>
                </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-6">
                {/* Graduation Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><GraduationCap /> Đồ án Tốt nghiệp</CardTitle>
                        <CardDescription className="text-xs">Rubric sử dụng: {getRubricName(supervisorGraduationRubric, isLoadingSupGradRubric)}</CardDescription>
                    </CardHeader>
                    {isLoadingRubrics ? (
                        <div className="p-6"><Skeleton className="h-20 w-full" /></div>
                    ) : (
                        <GraduationGradingView
                            registrations={graduationRegistrations}
                            rubric={supervisorGraduationRubric}
                            evaluations={sessionEvaluations}
                            supervisorId={supervisorId}
                            sessionId={session.id}
                        />
                    )}
                </Card>

                {/* Internship Section */}
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><Briefcase /> Thực tập Doanh nghiệp</CardTitle>
                        <CardDescription className="text-xs">Rubric sử dụng (dành cho đơn vị): {getRubricName(companyInternshipRubric, isLoadingCompInternRubric)}</CardDescription>
                    </CardHeader>
                    {isLoadingRubrics ? (
                        <div className="p-6"><Skeleton className="h-20 w-full" /></div>
                    ) : (
                        <InternshipGradingView
                            registrations={internshipRegistrations}
                            rubric={companyInternshipRubric}
                            evaluations={sessionEvaluations}
                            supervisorId={supervisorId}
                            sessionId={session.id}
                        />
                    )}
                </Card>

            </AccordionContent>
        </AccordionItem>
    );
};

  const isLoading = isLoadingSessions || isLoadingAssignments || isLoadingEvaluations;

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
                <p>Bạn hiện không được phân công hướng dẫn sinh viên nào trong các đợt báo cáo đang diễn ra.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
        <Accordion type="multiple" defaultValue={supervisedAssignments.map(s => `session-${s.session.id}`)}>
            {supervisedAssignments.map((sessionData) => (
                <SessionAccordionItem key={sessionData.session.id} sessionData={sessionData} />
            ))}
        </Accordion>
    </div>
  );
}
