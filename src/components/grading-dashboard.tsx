
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
import { GradingForm } from './grading-form';
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

interface ProjectGroup {
    projectTitle: string;
    students: DefenseRegistration[];
    // Graduation project details
    summary?: string;
    objectives?: string;
    expectedResults?: string;
    reportLink?: string;
    // Internship details
    internship_companyName?: string;
    internship_companyAddress?: string;
    internship_companySupervisorName?: string;
    internship_companySupervisorPhone?: string;
    internship_registrationFormLink?: string;
    internship_commitmentFormLink?: string;
    internship_acceptanceLetterLink?: string;
    internship_feedbackFormLink?: string;
    internship_reportLink?: string;
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
    const [selectedGroup, setSelectedGroup] = useState<ProjectGroup | null>(null);
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
            // Find a representative student who has updated their info
            const representativeStudent = 
                students.find(s => s.summary || s.reportLink || s.internship_companyName) ||
                students[0];

            return {
                projectTitle, 
                students,
                summary: representativeStudent?.summary,
                objectives: representativeStudent?.objectives,
                expectedResults: representativeStudent?.expectedResults,
                reportLink: representativeStudent?.reportLink,
                internship_companyName: representativeStudent?.internship_companyName,
                internship_companyAddress: representativeStudent?.internship_companyAddress,
                internship_companySupervisorName: representativeStudent?.internship_companySupervisorName,
                internship_companySupervisorPhone: representativeStudent?.internship_companySupervisorPhone,
                internship_registrationFormLink: representativeStudent?.internship_registrationFormLink,
                internship_commitmentFormLink: representativeStudent?.internship_commitmentFormLink,
                internship_acceptanceLetterLink: representativeStudent?.internship_acceptanceLetterLink,
                internship_feedbackFormLink: representativeStudent?.internship_feedbackFormLink,
                internship_reportLink: representativeStudent?.internship_reportLink,
            }
        });
    }, [studentsInSubcommittee]);

    const handleGradeClick = (group: ProjectGroup, rubric: Rubric, type: 'graduation' | 'internship') => {
        setSelectedGroup(group);
        setSelectedRubric(rubric);
        setSelectedEvalType(type);
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
                            <div className="flex items-center py-4">
                                <AccordionTrigger className="hover:no-underline flex-1 p-0">
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
                                <div className="flex items-center gap-2 ml-auto pl-4">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        disabled={!graduationRubric}
                                        onClick={() => graduationRubric && handleGradeClick(group, graduationRubric, 'graduation')}
                                    >
                                        <GraduationCap className="mr-2 h-4 w-4"/>
                                        Chấm TN
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        disabled={!internshipRubric}
                                        onClick={() => internshipRubric && handleGradeClick(group, internshipRubric, 'internship')}
                                    >
                                        <Briefcase className="mr-2 h-4 w-4"/>
                                        Chấm TT
                                    </Button>
                                </div>
                            </div>
                            <AccordionContent>
                                <div className="space-y-6 pt-2 border-t mt-2">
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
                                     <Separator />
                                     <div>
                                         <h5 className="font-semibold mb-2">Thông tin Thực tập</h5>
                                          {group.internship_companyName ? (
                                                <div className="space-y-4 pl-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                        <div className="flex items-start gap-2">
                                                            <Building className="h-4 w-4 mt-1 text-primary"/>
                                                            <div>
                                                                <p className="font-medium">Đơn vị thực tập</p>
                                                                <p className="text-muted-foreground">{group.internship_companyName}</p>
                                                                <p className="text-muted-foreground">{group.internship_companyAddress}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <UserCircle className="h-4 w-4 mt-1 text-primary"/>
                                                             <div>
                                                                <p className="font-medium">Người hướng dẫn tại đơn vị</p>
                                                                <p className="text-muted-foreground">{group.internship_companySupervisorName || 'N/A'}</p>
                                                                <p className="text-muted-foreground">{group.internship_companySupervisorPhone || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <h6 className="font-medium flex items-center gap-2 text-sm"><LinkIcon className="h-4 w-4 text-primary"/>Các tài liệu liên quan</h6>
                                                        <ul className="list-disc list-inside text-sm text-blue-500 space-y-1">
                                                            {group.internship_registrationFormLink && <li><a href={group.internship_registrationFormLink} target="_blank" rel="noopener noreferrer" className="hover:underline">Đơn đăng kí thực tập</a></li>}
                                                            {group.internship_commitmentFormLink && <li><a href={group.internship_commitmentFormLink} target="_blank" rel="noopener noreferrer" className="hover:underline">Đơn cam kết tự đi thực tập</a></li>}
                                                            {group.internship_acceptanceLetterLink && <li><a href={group.internship_acceptanceLetterLink} target="_blank" rel="noopener noreferrer" className="hover:underline">Giấy tiếp nhận thực tập</a></li>}
                                                            {group.internship_feedbackFormLink && <li><a href={group.internship_feedbackFormLink} target="_blank" rel="noopener noreferrer" className="hover:underline">Giấy nhận xét từ đơn vị</a></li>}
                                                            {group.internship_reportLink && <li><a href={group.internship_reportLink} target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold">File báo cáo thực tập</a></li>}
                                                        </ul>
                                                    </div>
                                                </div>
                                          ) : (
                                            <p className="text-sm text-muted-foreground pl-6">Chưa có thông tin thực tập.</p>
                                          )}
                                     </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
            {selectedGroup && selectedRubric && selectedEvalType && (
                 <Dialog open={isGradingDialogOpen} onOpenChange={setIsGradingDialogOpen}>
                    <DialogContent className="sm:max-w-3xl">
                         <GradingForm 
                            projectGroup={selectedGroup}
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
