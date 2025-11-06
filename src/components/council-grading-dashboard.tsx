

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, getDocs, doc, writeBatch, deleteDoc } from 'firebase/firestore';
import type { GraduationDefenseSession, DefenseCouncilMember, DefenseSubCommittee, Rubric, DefenseRegistration, Evaluation } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ClipboardCheck, Info, Users, FileText, Book, Target, CheckCircle, Link as LinkIcon, GraduationCap, Briefcase, Building, Phone, UserCircle, Search, UserX, UserCheck as UserCheckIcon, MoreHorizontal } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogTrigger, DialogContent } from './ui/dialog';
import { GradingForm, type ProjectGroup } from './grading-form';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


interface CouncilGradingDashboardProps {
  supervisorId: string;
  userRole: 'supervisor' | 'admin';
}

interface SessionWithCouncilAssignments {
  session: GraduationDefenseSession;
  registrations: DefenseRegistration[];
  isCouncilMember: boolean;
  subCommittees: DefenseSubCommittee[];
}

function SubcommitteeGradingView({
    subcommittee, 
    registrations,
    evaluations,
    councilGraduationRubric,
    councilInternshipRubric,
    supervisorId,
    sessionId,
    onRefresh
}: { 
    subcommittee: DefenseSubCommittee, 
    registrations: DefenseRegistration[],
    evaluations: Evaluation[],
    councilGraduationRubric: Rubric | null,
    councilInternshipRubric: Rubric | null,
    supervisorId: string,
    sessionId: string,
    onRefresh: () => void;
}) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [selectedGroupForGrading, setSelectedGroupForGrading] = useState<ProjectGroup | null>(null);
    const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
    const [selectedEvalType, setSelectedEvalType] = useState<'graduation' | 'internship' | null>(null);
    const [isGradingDialogOpen, setIsGradingDialogOpen] = useState(false);
    const [existingEvaluation, setExistingEvaluation] = useState<Evaluation | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const studentsInSubcommittee = useMemo(() => {
        return registrations.filter(reg => reg.subCommitteeId === subcommittee.id);
    }, [registrations, subcommittee.id]);

    const projectGroups = useMemo(() => {
        const reportingStudents = studentsInSubcommittee.filter(reg => reg.graduationStatus === 'reporting' && reg.reportStatus === 'approved');
        const groups = new Map<string, DefenseRegistration[]>();
        reportingStudents.forEach(reg => {
            const projectKey = reg.projectTitle || `_individual_${reg.id}`;
            if (!groups.has(projectKey)) {
                groups.set(projectKey, []);
            }
            groups.get(projectKey)!.push(reg);
        });

        const allGroups = Array.from(groups.entries()).map(([projectTitle, students]) => {
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
        
        if (!searchTerm) {
            return allGroups;
        }
        
        const term = searchTerm.toLowerCase();
        return allGroups.filter(group => 
            group.projectTitle.toLowerCase().includes(term) ||
            group.students.some(s => 
                s.studentName.toLowerCase().includes(term) ||
                s.studentId.toLowerCase().includes(term)
            )
        );

    }, [studentsInSubcommittee, searchTerm]);

    const internshipStudents = useMemo(() => {
        const allInternshipStudents = studentsInSubcommittee.filter(reg => reg.internshipStatus === 'reporting');
         if (!searchTerm) {
            return allInternshipStudents;
        }
        const term = searchTerm.toLowerCase();
        return allInternshipStudents.filter(student => 
            student.studentName.toLowerCase().includes(term) ||
            student.studentId.toLowerCase().includes(term) ||
            (student.internship_companyName && student.internship_companyName.toLowerCase().includes(term))
        );
    }, [studentsInSubcommittee, searchTerm]);
    
    // Find evaluations for each group/student, specific to the evaluator and rubric
    const getEvaluationForGroup = (group: ProjectGroup, rubric: Rubric | null) => {
        if (!rubric) return null;
        const studentId = group.students[0].id;
        return evaluations.find(e => 
            e.registrationId === studentId && 
            e.evaluationType === 'graduation' &&
            e.evaluatorId === supervisorId &&
            e.rubricId === rubric.id
        ) || null;
    }
    
    const getEvaluationForInternship = (student: DefenseRegistration, rubric: Rubric | null) => {
         if (!rubric) return null;
        return evaluations.find(e => 
            e.registrationId === student.id &&
            e.evaluationType === 'internship' &&
            e.evaluatorId === supervisorId &&
            e.rubricId === rubric.id
        ) || null;
    }

    const handleGradeGraduationClick = (group: (typeof projectGroups)[0]) => {
        if (!councilGraduationRubric) return;
        setExistingEvaluation(getEvaluationForGroup(group, councilGraduationRubric) || null);
        setSelectedGroupForGrading({
            projectTitle: group.projectTitle,
            students: group.students
        });
        setSelectedRubric(councilGraduationRubric);
        setSelectedEvalType('graduation');
        setIsGradingDialogOpen(true);
    };

    const handleGradeInternshipClick = (student: DefenseRegistration) => {
        if (!councilInternshipRubric) return;
        setExistingEvaluation(getEvaluationForInternship(student, councilInternshipRubric) || null);
        setSelectedGroupForGrading({
            projectTitle: `Thực tập của ${student.studentName}`,
            students: [student]
        });
        setSelectedRubric(councilInternshipRubric);
        setSelectedEvalType('internship');
        setIsGradingDialogOpen(true);
    };

    const handleMarkAbsent = async (registrations: DefenseRegistration[], rubric: Rubric | null, type: 'graduation' | 'internship') => {
        if (!rubric) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Chưa gán rubric cho loại báo cáo này.' });
            return;
        }

        const batch = writeBatch(firestore);
        registrations.forEach(reg => {
            const existingEval = evaluations.find(e => e.registrationId === reg.id && e.evaluatorId === supervisorId && e.rubricId === rubric.id);
            const evalDocRef = existingEval ? doc(firestore, 'evaluations', existingEval.id) : doc(collection(firestore, 'evaluations'));
            
            const absentEval: Omit<Evaluation, 'id' | 'evaluationDate'> = {
                sessionId: sessionId,
                registrationId: reg.id,
                evaluatorId: supervisorId,
                rubricId: rubric.id,
                evaluationType: type,
                attendance: 'absent',
                scores: rubric.criteria.map(c => ({ criterionId: c.id, score: 0 })),
                totalScore: 0,
                comments: 'Vắng mặt',
            };
            batch.set(evalDocRef, { ...absentEval, evaluationDate: new Date() });
        });

        batch.commit().then(() => {
            toast({ title: 'Thành công', description: `Đã ghi nhận vắng mặt cho ${registrations.length} sinh viên.` });
            onRefresh();
        }).catch((error: any) => {
            console.error("Error marking absent:", error);
            if (error.code === 'permission-denied') {
                const contextualError = new FirestorePermissionError({
                    path: 'evaluations',
                    operation: 'write',
                    requestResourceData: { error: 'Batch write for absent evaluations failed' },
                });
                errorEmitter.emit('permission-error', contextualError);
            } else {
                 toast({ variant: 'destructive', title: 'Lỗi', description: `Không thể ghi nhận vắng mặt: ${error.message}` });
            }
        });
    };
    
    const handleRevertAbsence = async (evaluationId: string) => {
        const evalDocRef = doc(firestore, 'evaluations', evaluationId);
        try {
            await deleteDoc(evalDocRef);
            toast({ title: 'Thành công', description: 'Đã hoàn tác ghi vắng.' });
            onRefresh();
        } catch (error) {
            const contextualError = new FirestorePermissionError({
                path: evalDocRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', contextualError);
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể hoàn tác.' });
        }
    };


    const InternshipInfo = ({ student }: { student: DefenseRegistration }) => (
        <div className="mt-2 space-y-3 text-xs">
             <div className="flex items-start gap-2">
                <Users className="h-3 w-3 mt-0.5 text-muted-foreground"/>
                 <p className="font-medium">{student.studentName} ({student.studentId})</p>
            </div>
            {student.internship_companyName ? (
                <>
                    <div className="flex items-start gap-2">
                        <Building className="h-3 w-3 mt-0.5 text-muted-foreground"/>
                        <div>
                            <p className="font-medium">{student.internship_companyName}</p>
                            <p className="text-muted-foreground">{student.internship_companyAddress}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <UserCircle className="h-3 w-3 mt-0.5 text-muted-foreground"/>
                        <div>
                            <p>{student.internship_companySupervisorName || 'N/A'}</p>
                            <p>{student.internship_companySupervisorPhone || 'N/A'}</p>
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
                </>
            ) : (
                <p className="text-xs text-muted-foreground pl-6 mt-1">Chưa có thông tin thực tập.</p>
            )}
        </div>
    );

    const getDefaultTab = () => {
      if (projectGroups.length > 0) return "graduation";
      if (internshipStudents.length > 0) return "internship";
      return "graduation";
    }

    return (
        <>
            <CardContent>
                <div className="relative mb-4">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Tìm theo MSSV, tên SV, đề tài, công ty..."
                        className="w-full pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                 <Tabs defaultValue={getDefaultTab()} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="graduation" disabled={projectGroups.length === 0}>
                             <GraduationCap className="mr-2 h-4 w-4"/>
                            Tốt nghiệp ({projectGroups.length})
                        </TabsTrigger>
                        <TabsTrigger value="internship" disabled={internshipStudents.length === 0}>
                            <Briefcase className="mr-2 h-4 w-4"/>
                            Thực tập ({internshipStudents.length})
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="graduation" className="pt-4">
                        {projectGroups.length > 0 ? (
                            <Accordion type="multiple" className="w-full space-y-4">
                                {projectGroups.map((group) => {
                                    const gradEvaluation = getEvaluationForGroup(group, councilGraduationRubric);
                                    const isAbsent = gradEvaluation?.attendance === 'absent';

                                    return (
                                        <AccordionItem value={group.projectTitle} key={group.projectTitle} className="border rounded-lg px-4 bg-background">
                                            <div className="flex items-center py-2">
                                                <AccordionTrigger className="hover:no-underline flex-1 p-0 py-2">
                                                    <div className="text-left">
                                                        <h4 className="font-semibold text-base">
                                                            {group.projectTitle.startsWith('_individual_') ? 'Đề tài cá nhân' : group.projectTitle}
                                                        </h4>
                                                         <p className="text-sm text-muted-foreground mt-1">
                                                            SV: {group.students.map(s => `${s.studentName} (${s.studentId})`).join(', ')}
                                                        </p>
                                                    </div>
                                                </AccordionTrigger>
                                                <div className="ml-auto pl-4 flex items-center gap-2">
                                                     {isAbsent ? (
                                                        <Badge variant="destructive">Vắng</Badge>
                                                    ) : gradEvaluation && (
                                                        <Badge variant="secondary" className="border-green-600/50 bg-green-50 text-green-700">
                                                            {gradEvaluation.totalScore.toFixed(2)}
                                                        </Badge>
                                                    )}
                                                     <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleGradeGraduationClick(group)} disabled={!councilGraduationRubric || isAbsent}>
                                                                <UserCheckIcon className="mr-2 h-4 w-4" />
                                                                <span>{gradEvaluation && !isAbsent ? 'Sửa điểm' : 'Chấm điểm'}</span>
                                                            </DropdownMenuItem>
                                                            {isAbsent ? (
                                                                <DropdownMenuItem onClick={() => handleRevertAbsence(gradEvaluation.id)}>
                                                                    <UserCheckIcon className="mr-2 h-4 w-4 text-green-500" />
                                                                    <span>Hoàn tác ghi vắng</span>
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                 <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                         <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={!councilGraduationRubric}>
                                                                            <UserX className="mr-2 h-4 w-4 text-red-500" />
                                                                            <span>Ghi vắng</span>
                                                                        </DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                     <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Xác nhận ghi vắng?</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Hành động này sẽ ghi nhận sinh viên vắng mặt và cho điểm 0 cho tất cả các mục. Bạn có thể hoàn tác sau.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => handleMarkAbsent(group.students, councilGraduationRubric, 'graduation')}>Xác nhận</AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                            <AccordionContent>
                                                <div className="space-y-4 pt-2 border-t">
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
                                    )
                                })}
                            </Accordion>
                         ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Không có đề tài nào cần chấm điểm tốt nghiệp.</p>
                         )}
                    </TabsContent>
                    <TabsContent value="internship" className="pt-4">
                        {internshipStudents.length > 0 ? (
                            <div className="space-y-4">
                                {internshipStudents.map((student) => {
                                    const internEvaluation = getEvaluationForInternship(student, councilInternshipRubric);
                                    const isAbsent = internEvaluation?.attendance === 'absent';
                                    return (
                                        <Card key={student.id} className="p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <InternshipInfo student={student} />
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                     {isAbsent ? (
                                                        <Badge variant="destructive">Vắng</Badge>
                                                    ) : internEvaluation && (
                                                        <Badge variant="secondary" className="border-green-600/50 bg-green-50 text-green-700">
                                                            {internEvaluation.totalScore.toFixed(2)}
                                                        </Badge>
                                                    )}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleGradeInternshipClick(student)} disabled={!councilInternshipRubric || isAbsent}>
                                                                <UserCheckIcon className="mr-2 h-4 w-4" />
                                                                <span>{internEvaluation && !isAbsent ? 'Sửa điểm' : 'Chấm điểm'}</span>
                                                            </DropdownMenuItem>
                                                            {isAbsent ? (
                                                                <DropdownMenuItem onClick={() => handleRevertAbsence(internEvaluation.id)}>
                                                                    <UserCheckIcon className="mr-2 h-4 w-4 text-green-500" />
                                                                    <span>Hoàn tác ghi vắng</span>
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={!councilInternshipRubric}>
                                                                            <UserX className="mr-2 h-4 w-4 text-red-500" />
                                                                            <span>Ghi vắng</span>
                                                                        </DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Xác nhận ghi vắng?</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Hành động này sẽ ghi nhận sinh viên vắng mặt và cho điểm 0 cho tất cả các mục. Bạn có thể hoàn tác sau.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => handleMarkAbsent([student], councilInternshipRubric, 'internship')}>Xác nhận</AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        </Card>
                                    )
                                })}
                            </div>
                        ) : (
                             <p className="text-sm text-muted-foreground text-center py-4">Không có sinh viên nào cần chấm điểm thực tập.</p>
                        )}
                    </TabsContent>
                </Tabs>
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
                            onFinished={() => {
                                setIsGradingDialogOpen(false);
                                onRefresh();
                            }}
                            existingEvaluation={existingEvaluation}
                         />
                    </DialogContent>
                </Dialog>
            )}
        </>
    )
}

export function CouncilGradingDashboard({ supervisorId, userRole }: CouncilGradingDashboardProps) {
  const firestore = useFirestore();
  const [refreshKey, setRefreshKey] = useState(0);
  
  const sessionsQuery = useMemoFirebase(() => query(collection(firestore, 'graduationDefenseSessions'), where('status', '==', 'ongoing')), [firestore, refreshKey]);
  const { data: allSessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);

  const [councilAssignments, setCouncilAssignments] = useState<SessionWithCouncilAssignments[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

  const ongoingSessionIds = useMemo(() => allSessions?.map(s => s.id) || [], [allSessions]);

  const evaluationsQuery = useMemoFirebase(
      () => ongoingSessionIds.length > 0 ? query(collection(firestore, 'evaluations'), where('sessionId', 'in', ongoingSessionIds)) : null,
      [firestore, ongoingSessionIds, refreshKey]
  );
  const { data: allEvaluations, isLoading: isLoadingEvaluations } = useCollection<Evaluation>(evaluationsQuery);

  const forceRefreshAll = () => {
    setRefreshKey(prev => prev + 1);
  };


  useEffect(() => {
    if (isLoadingSessions || !allSessions) return;

    const fetchAssignments = async () => {
      setIsLoadingAssignments(true);
      const councilAssignmentsData: SessionWithCouncilAssignments[] = [];

      for (const session of allSessions) {
        let isCouncilMember = false;
        const assignedSubCommittees: DefenseSubCommittee[] = [];

        const [councilSnapshot, subCommitteesSnapshot, registrationsSnapshot] = await Promise.all([
            getDocs(collection(firestore, `graduationDefenseSessions/${session.id}/council`)),
            getDocs(collection(firestore, `graduationDefenseSessions/${session.id}/subCommittees`)),
            getDocs(query(collection(firestore, 'defenseRegistrations'), where('sessionId', '==', session.id))),
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
          councilAssignmentsData.push({
            session,
            registrations,
            isCouncilMember,
            subCommittees: assignedSubCommittees,
          });
        }
      }
      setCouncilAssignments(councilAssignmentsData);
      setIsLoadingAssignments(false);
    };

    fetchAssignments();
  }, [allSessions, isLoadingSessions, supervisorId, firestore, refreshKey]);
  
  
  const CouncilSessionAccordionItem = ({ sessionData, onRefresh }: { sessionData: SessionWithCouncilAssignments, onRefresh: () => void }) => {
    const { session, isCouncilMember, subCommittees, registrations } = sessionData;
    
    const councilGradRubricDocRef = useMemoFirebase(() => (session.councilGraduationRubricId ? doc(firestore, 'rubrics', session.councilGraduationRubricId) : null), [firestore, session.councilGraduationRubricId]);
    const { data: councilGraduationRubric, isLoading: isLoadingCouncilGradRubric } = useDoc<Rubric>(councilGradRubricDocRef);
    
    const councilInternRubricDocRef = useMemoFirebase(() => (session.councilInternshipRubricId ? doc(firestore, 'rubrics', session.councilInternshipRubricId) : null), [firestore, session.councilInternshipRubricId]);
    const { data: councilInternshipRubric, isLoading: isLoadingCouncilInternRubric } = useDoc<Rubric>(councilInternRubricDocRef);

    const sessionEvaluations = useMemo(() => {
        return allEvaluations?.filter(e => e.sessionId === session.id) || [];
    }, [allEvaluations, session.id]);

    const getRubricName = (rubric: Rubric | null | undefined, isLoading: boolean) => {
        if (isLoading) return 'Đang tải...';
        return rubric ? rubric.name : 'Chưa gán';
    }

    return (
        <AccordionItem key={session.id} value={`council-${session.id}`}>
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
             <Accordion type="multiple" className="space-y-4" defaultValue={subCommittees.map(sc => sc.id)}>
                {subCommittees.map(sc => (
                    <AccordionItem value={sc.id} key={sc.id} className="border rounded-lg bg-card overflow-hidden">
                       <AccordionTrigger className="px-6 hover:no-underline">
                           <div className="text-left">
                                <CardTitle className="text-base">
                                    {sc.name}
                                </CardTitle>
                                {sc.description && <CardDescription className="pt-1">{sc.description}</CardDescription>}
                                <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-2">
                                    <span>{sc.members.length} thành viên</span>
                                    <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> HĐ chấm TN: {getRubricName(councilGraduationRubric, isLoadingCouncilGradRubric)}</span>
                                    <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> HĐ chấm TT: {getRubricName(councilInternshipRubric, isLoadingCouncilInternRubric)}</span>
                                </CardDescription>
                           </div>
                       </AccordionTrigger>
                       <AccordionContent>
                         {(isLoadingCouncilGradRubric || isLoadingCouncilInternRubric) ? (
                            <div className="p-6"><Skeleton className="h-20 w-full" /></div>
                        ) : (
                            <SubcommitteeGradingView 
                                subcommittee={sc} 
                                registrations={registrations} 
                                evaluations={sessionEvaluations}
                                councilGraduationRubric={councilGraduationRubric || null}
                                councilInternshipRubric={councilInternshipRubric || null}
                                supervisorId={supervisorId}
                                sessionId={session.id}
                                onRefresh={onRefresh}
                            />
                        )}
                       </AccordionContent>
                    </AccordionItem>
                ))}
             </Accordion>
            </AccordionContent>
        </AccordionItem>
    );
  }

  const isLoading = isLoadingSessions || isLoadingAssignments || isLoadingEvaluations;

  if (isLoading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
        </div>
    );
  }
  
  if (councilAssignments.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Info /> Chưa được phân công</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Bạn hiện chưa được phân công vào bất kỳ hội đồng hoặc tiểu ban nào trong các đợt đang diễn ra.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
        <Accordion type="multiple" defaultValue={councilAssignments.map(s => `council-${s.session.id}`)}>
            {councilAssignments.map((sessionData) => (
                <CouncilSessionAccordionItem key={sessionData.session.id} sessionData={sessionData} onRefresh={forceRefreshAll} />
            ))}
        </Accordion>
    </div>
  );
}

    
