
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import type { GraduationDefenseSession, DefenseCouncilMember, DefenseSubCommittee, Rubric, DefenseRegistration, StudentWithRegistrationDetails } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ClipboardCheck, Info, Users, FileText, Book, Target, CheckCircle, Link as LinkIcon, GraduationCap, Briefcase, Building, Phone, UserCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogTrigger, DialogContent } from './ui/dialog';
import { GradingForm, type ProjectGroup } from './grading-form';
import { Separator } from './ui/separator';

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
function SubcommitteeGradingView({
    subcommittee, 
    registrations,
    graduationRubric,
    internshipRubric,
    supervisorId,
    sessionId
}: { 
    subcommittee: DefenseSubCommittee, 
    registrations: DefenseRegistration[],
    graduationRubric: Rubric | null,
    internshipRubric: Rubric | null,
    supervisorId: string,
    sessionId: string,
}) {
    const [selectedGroupForGrading, setSelectedGroupForGrading] = useState<ProjectGroup | null>(null);
    const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
    const [selectedEvalType, setSelectedEvalType] = useState<'graduation' | 'internship' | null>(null);
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
            const representativeStudent = 
                students.find(s => s.summary || s.reportLink) ||
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

    const handleGradeGraduationClick = (group: (typeof projectGroups)[0]) => {
        if (!graduationRubric) return;
        setSelectedGroupForGrading({
            projectTitle: group.projectTitle,
            students: group.students
        });
        setSelectedRubric(graduationRubric);
        setSelectedEvalType('graduation');
        setIsGradingDialogOpen(true);
    };

    const handleGradeInternshipClick = (student: DefenseRegistration) => {
        if (!internshipRubric) return;
        setSelectedGroupForGrading({
            projectTitle: `Thực tập của ${student.studentName}`,
            students: [student] // Pass only the single student
        });
        setSelectedRubric(internshipRubric);
        setSelectedEvalType('internship');
        setIsGradingDialogOpen(true);
    };

    if (studentsInSubcommittee.length === 0) {
        return <p className="text-sm text-muted-foreground px-6 pb-4">Không có sinh viên nào được phân công vào tiểu ban này.</p>;
    }

    const InternshipInfo = ({ student }: { student: DefenseRegistration }) => (
        <div className="pl-6 mt-2">
            <h6 className="font-semibold text-sm flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary"/>Thông tin Thực tập</h6>
            {student.internship_companyName ? (
                <div className="space-y-3 pl-6 mt-2 text-xs">
                    <div className="flex items-start gap-2">
                        <Building className="h-3 w-3 mt-0.5 text-muted-foreground"/>
                        <div>
                            <p className="font-medium text-muted-foreground">{student.internship_companyName}</p>
                            <p className="text-muted-foreground">{student.internship_companyAddress}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <UserCircle className="h-3 w-3 mt-0.5 text-muted-foreground"/>
                        <div>
                            <p className="text-muted-foreground">{student.internship_companySupervisorName || 'N/A'}</p>
                            <p className="text-muted-foreground">{student.internship_companySupervisorPhone || 'N/A'}</p>
                        </div>
                    </div>
                     {student.internship_reportLink && (
                        <div className="flex items-start gap-2">
                            <LinkIcon className="h-3 w-3 mt-0.5 text-muted-foreground"/>
                             <a href={student.internship_reportLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">
                                Link báo cáo thực tập
                            </a>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground pl-6 mt-1">Chưa có thông tin thực tập.</p>
            )}
        </div>
    );


    return (
        <>
            <CardContent>
                <Accordion type="multiple" className="w-full space-y-4">
                    {projectGroups.map((group) => (
                        <AccordionItem value={group.projectTitle} key={group.projectTitle} className="border rounded-lg px-4 bg-background">
                            <div className="flex items-center py-4">
                                <AccordionTrigger className="hover:no-underline flex-1 p-0">
                                    <div className="text-left">
                                        <h4 className="font-semibold text-base">
                                            {group.projectTitle.startsWith('_individual_') ? 'Đề tài cá nhân' : group.projectTitle}
                                        </h4>
                                    </div>
                                </AccordionTrigger>
                                <div className="ml-auto pl-4">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        disabled={!graduationRubric}
                                        onClick={() => handleGradeGraduationClick(group)}
                                    >
                                        <GraduationCap className="mr-2 h-4 w-4"/>
                                        Chấm TN
                                    </Button>
                                </div>
                            </div>
                            <AccordionContent>
                                <div className="space-y-4 pt-2 border-t">
                                     {group.students.map((student, index) => (
                                        <div key={student.id} className={index > 0 ? 'border-t mt-4 pt-4' : ''}>
                                            <div className="flex items-center justify-between">
                                                 <div className="flex items-center gap-2 text-sm">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <span>{student.studentName} ({student.studentId})</span>
                                                </div>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    disabled={!internshipRubric}
                                                    onClick={() => handleGradeInternshipClick(student)}
                                                >
                                                    <Briefcase className="mr-2 h-4 w-4"/>
                                                    Chấm TT
                                                </Button>
                                            </div>
                                            <InternshipInfo student={student} />
                                        </div>
                                     ))}
                                     <Separator className="my-4"/>
                                     <div>
                                        <h5 className="font-semibold mb-2">Thông tin Đồ án Tốt nghiệp</h5>
                                        <div className="space-y-4 pl-6">
                                            <div className="space-y-2">
                                                <h6 className="font-medium flex items-center gap-2 text-sm"><Book className="h-4 w-4 text-primary"/>Tóm tắt</h6>
                                                <p className="text-sm text-muted-foreground">{group.summary || 'Chưa có thông tin.'}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <h6 className="font-medium flex items-center gap-2 text-sm"><Target className="h-4 w-4 text-primary"/>Mục tiêu</h6>
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{group.objectives || 'Chưa có thông tin.'}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <h6 className="font-medium flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-primary"/>Kết quả mong đợi</h6>
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{group.expectedResults || 'Chưa có thông tin.'}</p>
                                            </div>
                                            {group.reportLink && (
                                                <div className="space-y-2">
                                                    <h6 className="font-medium flex items-center gap-2 text-sm"><LinkIcon className="h-4 w-4 text-primary"/>Link báo cáo</h6>
                                                    <a href={group.reportLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline break-all">
                                                        {group.reportLink}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                     </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
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
        if (!supervisorId) continue;

        let isCouncilMember = false;
        const assignedSubCommittees: DefenseSubCommittee[] = [];

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
    
    const gradRubricDocRef = useMemoFirebase(
      () => (session.graduationRubricId ? doc(firestore, 'rubrics', session.graduationRubricId) : null),
      [firestore, session.graduationRubricId]
    );
    const { data: graduationRubric, isLoading: isLoadingGradRubric } = useDoc<Rubric>(gradRubricDocRef);
    
    const internRubricDocRef = useMemoFirebase(
      () => (session.internshipRubricId ? doc(firestore, 'rubrics', session.internshipRubricId) : null),
      [firestore, session.internshipRubricId]
    );
    const { data: internshipRubric, isLoading: isLoadingInternRubric } = useDoc<Rubric>(internRubricDocRef);

    const getRubricName = (rubric: Rubric | null | undefined, isLoading: boolean) => {
        if (isLoading) return 'Đang tải...';
        return rubric ? rubric.name : 'Chưa gán';
    }

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
                        <CardDescription className="flex items-center gap-4 text-xs">
                            <span>{sc.members.length} thành viên</span>
                             <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Rubric TN: {getRubricName(graduationRubric, isLoadingGradRubric)}</span>
                            <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> Rubric TT: {getRubricName(internshipRubric, isLoadingInternRubric)}</span>
                        </CardDescription>
                    </CardHeader>
                    {(isLoadingGradRubric || isLoadingInternRubric) ? (
                        <div className="p-6"><Skeleton className="h-20 w-full" /></div>
                    ) : (
                         <SubcommitteeGradingView 
                            subcommittee={sc} 
                            registrations={registrations} 
                            graduationRubric={graduationRubric || null}
                            internshipRubric={internshipRubric || null}
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
