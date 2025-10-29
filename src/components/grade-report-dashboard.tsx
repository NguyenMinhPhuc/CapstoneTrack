
'use client';

import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { GraduationDefenseSession, DefenseRegistration, Evaluation, DefenseSubCommittee, Rubric } from '@/lib/types';
import { GradeReportTable } from './grade-report-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { BookCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GradeReportPloTable } from './grade-report-plo-table';

const statusLabel: Record<string, string> = {
  ongoing: 'Đang diễn ra',
  upcoming: 'Sắp diễn ra',
  completed: 'Đã hoàn thành',
};

export function GradeReportDashboard() {
  const firestore = useFirestore();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const sessionsQuery = useMemoFirebase(
    () => collection(firestore, 'graduationDefenseSessions'),
    [firestore]
  );
  const { data: sessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);
  
  const groupedSessions = useMemo(() => {
    if (!sessions) return { ongoing: [], upcoming: [], completed: [] };
    return sessions.reduce((acc, session) => {
      const group = acc[session.status] || [];
      group.push(session);
      acc[session.status] = group;
      return acc;
    }, {} as Record<GraduationDefenseSession['status'], GraduationDefenseSession[]>);
  }, [sessions]);


  const selectedSession = useMemo(() => {
      return sessions?.find(s => s.id === selectedSessionId) || null;
  }, [sessions, selectedSessionId])

  // --- Data fetching moved up for reuse ---
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
  
  // Fetch all rubrics associated with the session
  const councilGradRubricDocRef = useMemoFirebase(() => (selectedSession?.councilGraduationRubricId ? doc(firestore, 'rubrics', selectedSession.councilGraduationRubricId) : null), [firestore, selectedSession]);
  const councilInternRubricDocRef = useMemoFirebase(() => (selectedSession?.councilInternshipRubricId ? doc(firestore, 'rubrics', selectedSession.councilInternshipRubricId) : null), [firestore, selectedSession]);
  const supervisorGradRubricDocRef = useMemoFirebase(() => (selectedSession?.supervisorGraduationRubricId ? doc(firestore, 'rubrics', selectedSession.supervisorGraduationRubricId) : null), [firestore, selectedSession]);
  const companyInternshipRubricDocRef = useMemoFirebase(() => (selectedSession?.companyInternshipRubricId ? doc(firestore, 'rubrics', selectedSession.companyInternshipRubricId) : null), [firestore, selectedSession]);

  const { data: councilGraduationRubric, isLoading: isLoadingCouncilGradRubric } = useDoc<Rubric>(councilGradRubricDocRef);
  const { data: councilInternshipRubric, isLoading: isLoadingCouncilInternRubric } = useDoc<Rubric>(councilInternRubricDocRef);
  const { data: supervisorGraduationRubric, isLoading: isLoadingSupervisorGradRubric } = useDoc<Rubric>(supervisorGradRubricDocRef);
  const { data: companyInternshipRubric, isLoading: isLoadingCompanyInternRubric } = useDoc<Rubric>(companyInternshipRubricDocRef);
  
  // --- End of data fetching ---

  const isLoading = isLoadingRegistrations || isLoadingEvaluations || isLoadingSubCommittees || isLoadingCouncilGradRubric || isLoadingCouncilInternRubric || isLoadingSupervisorGradRubric || isLoadingCompanyInternRubric;

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
               {Object.entries(groupedSessions).map(([status, sessionList]) =>
                  sessionList.length > 0 && (
                      <SelectGroup key={status}>
                          <SelectLabel>{statusLabel[status] || status}</SelectLabel>
                          {sessionList.map(session => (
                              <SelectItem key={session.id} value={session.id}>
                                  {session.name}
                              </SelectItem>
                          ))}
                      </SelectGroup>
                  )
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedSessionId && (
        isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary">Bảng điểm tổng hợp</TabsTrigger>
              <TabsTrigger value="plo">Bảng điểm CĐR</TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
                <Tabs defaultValue="graduation" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="graduation">Điểm Tốt nghiệp</TabsTrigger>
                        <TabsTrigger value="internship">Điểm Thực tập</TabsTrigger>
                    </TabsList>
                    <TabsContent value="graduation">
                        <GradeReportTable
                            reportType="graduation"
                            session={selectedSession}
                            registrations={registrations || []}
                            evaluations={evaluations || []}
                            subCommittees={subCommittees || []}
                        />
                    </TabsContent>
                    <TabsContent value="internship">
                        <GradeReportTable
                            reportType="internship"
                            session={selectedSession}
                            registrations={registrations || []}
                            evaluations={evaluations || []}
                            subCommittees={subCommittees || []}
                        />
                    </TabsContent>
                </Tabs>
            </TabsContent>
            <TabsContent value="plo">
               <Tabs defaultValue="council-graduation-plo" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
                        <TabsTrigger value="council-graduation-plo">HĐ chấm Tốt nghiệp</TabsTrigger>
                        <TabsTrigger value="supervisor-graduation-plo">GVHD chấm Tốt nghiệp</TabsTrigger>
                        <TabsTrigger value="council-internship-plo">HĐ chấm Thực tập</TabsTrigger>
                        <TabsTrigger value="company-internship-plo">ĐV chấm Thực tập</TabsTrigger>
                    </TabsList>
                    <TabsContent value="council-graduation-plo">
                        <GradeReportPloTable 
                            reportType="graduation"
                            evaluationSource="council"
                            registrations={registrations || []}
                            evaluations={evaluations || []}
                            rubric={councilGraduationRubric}
                        />
                    </TabsContent>
                    <TabsContent value="supervisor-graduation-plo">
                        <GradeReportPloTable 
                            reportType="graduation"
                            evaluationSource="supervisor"
                            registrations={registrations || []}
                            evaluations={evaluations || []}
                            rubric={supervisorGraduationRubric}
                        />
                    </TabsContent>
                     <TabsContent value="council-internship-plo">
                        <GradeReportPloTable 
                            reportType="internship"
                            evaluationSource="council"
                            registrations={registrations || []}
                            evaluations={evaluations || []}
                            rubric={councilInternshipRubric}
                        />
                    </TabsContent>
                    <TabsContent value="company-internship-plo">
                         <GradeReportPloTable 
                            reportType="internship"
                            evaluationSource="company"
                            registrations={registrations || []}
                            evaluations={evaluations || []}
                            rubric={companyInternshipRubric}
                        />
                    </TabsContent>
                </Tabs>
            </TabsContent>
          </Tabs>
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
