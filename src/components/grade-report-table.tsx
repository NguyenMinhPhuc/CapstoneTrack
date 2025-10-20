
'use client';

import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FileDown, Copy, MoreHorizontal, CheckCircle } from 'lucide-react';
import type { GraduationDefenseSession, DefenseRegistration, Evaluation, DefenseSubCommittee, SubCommitteeMember, ReportStatus } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import { CopyEvaluationDialog } from './copy-evaluation-dialog';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';

interface CouncilScore {
    role: string;
    score: number | null;
}

interface ProcessedGraduationData {
  id: string;
  studentId: string;
  studentName: string;
  projectTitle?: string;
  subCommitteeName: string;
  supervisorGradScore: number | null;
  councilScores: CouncilScore[];
  councilGradAvg: number | null;
  finalGradScore: number | null;
  currentStatus: ReportStatus;
}

interface ProcessedInternshipData {
    id: string;
    studentId: string;
    studentName: string;
    companyName?: string;
    subCommitteeName: string;
    companySupervisorScore: number | null;
    councilScores: CouncilScore[];
    councilInternAvg: number | null;
    finalInternScore: number | null;
    currentStatus: ReportStatus;
}


interface GradeReportTableProps {
  reportType: 'graduation' | 'internship';
  session: GraduationDefenseSession | null;
  registrations: DefenseRegistration[];
  evaluations: Evaluation[];
  subCommittees: DefenseSubCommittee[];
}

const COUNCIL_ROLES: SubCommitteeMember['role'][] = ['Head', 'Secretary', 'Commissioner'];

const roleDisplayNames: Record<SubCommitteeMember['role'], string> = {
    Head: "Trưởng ban",
    Secretary: "Thư ký",
    Commissioner: "Ủy viên"
}

export function GradeReportTable({ reportType, session, registrations, evaluations, subCommittees }: GradeReportTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<DefenseRegistration | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleStatusUpdate = async (registrationId: string, statusKey: 'graduationStatus' | 'internshipStatus') => {
      const docRef = doc(firestore, 'defenseRegistrations', registrationId);
      try {
          await updateDoc(docRef, { [statusKey]: 'completed' });
          toast({
              title: 'Thành công',
              description: 'Đã xác nhận hoàn thành cho sinh viên.'
          });
          // Data will refresh automatically via useCollection hook in parent
      } catch (error) {
          console.error("Error updating status: ", error);
          const contextualError = new FirestorePermissionError({
              path: docRef.path,
              operation: 'update',
              requestResourceData: { [statusKey]: 'completed' },
          });
          errorEmitter.emit('permission-error', contextualError);
      }
  }


  const processedData = useMemo(() => {
    if (!session) return [];
    const subCommitteeMap = new Map(subCommittees.map(sc => [sc.id, { name: sc.name, members: sc.members }]));

    if (reportType === 'graduation') {
        const gradCouncilWeight = (session.graduationCouncilWeight ?? 80) / 100;
        const gradSupervisorWeight = 1 - gradCouncilWeight;
        
        return registrations
            .filter(reg => reg.graduationStatus === 'reporting' || reg.graduationStatus === 'completed')
            .map((reg): ProcessedGraduationData => {
            const studentEvals = evaluations.filter(e => e.registrationId === reg.id);
            
            const supervisorGradEval = studentEvals.find(e => 
                e.evaluatorId === reg.supervisorId && 
                e.evaluationType === 'graduation' &&
                e.rubricId === session.supervisorGraduationRubricId
            );
            const supervisorGradScore = supervisorGradEval ? supervisorGradEval.totalScore : null;

            const subCommitteeDetails = reg.subCommitteeId ? subCommitteeMap.get(reg.subCommitteeId) : undefined;
            const subCommitteeMembers = subCommitteeDetails?.members || [];
            
            const councilScores: CouncilScore[] = COUNCIL_ROLES.map(role => {
                const member = subCommitteeMembers.find(m => m.role === role);
                if (!member) return { role, score: null };

                const evalRecord = studentEvals.find(e => 
                    e.evaluatorId === member.supervisorId &&
                    e.evaluationType === 'graduation' &&
                    e.rubricId === session.councilGraduationRubricId
                );
                return { role, score: evalRecord ? evalRecord.totalScore : null };
            });
            
            const validScores = councilScores.filter(s => s.score !== null).map(s => s.score as number);
            const councilGradAvg = validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : null;
            
            let finalGradScore: number | null = null;
            if (supervisorGradScore !== null && councilGradAvg !== null) {
                finalGradScore = councilGradAvg * gradCouncilWeight + supervisorGradScore * gradSupervisorWeight;
            }

            return {
                id: reg.id,
                studentId: reg.studentId,
                studentName: reg.studentName,
                projectTitle: reg.projectTitle,
                subCommitteeName: subCommitteeDetails?.name || 'Chưa phân công',
                supervisorGradScore: supervisorGradScore,
                councilScores: councilScores,
                councilGradAvg: councilGradAvg,
                finalGradScore: finalGradScore,
                currentStatus: reg.graduationStatus,
            };
        });
    } else { // internship report
        const internCouncilWeight = (session.internshipCouncilWeight ?? 50) / 100;
        const internCompanyWeight = 1 - internCouncilWeight;
        return registrations
        .filter(reg => reg.internshipStatus === 'reporting' || reg.internshipStatus === 'completed')
        .map((reg): ProcessedInternshipData => {
            const studentEvals = evaluations.filter(e => e.registrationId === reg.id);
            const subCommitteeDetails = reg.subCommitteeId ? subCommitteeMap.get(reg.subCommitteeId) : undefined;
            const subCommitteeMembers = subCommitteeDetails?.members || [];

            const companySupervisorEval = studentEvals.find(e =>
                e.evaluatorId === reg.internshipSupervisorId &&
                e.evaluationType === 'internship' &&
                e.rubricId === session.companyInternshipRubricId
            );
            const companySupervisorScore = companySupervisorEval ? companySupervisorEval.totalScore : null;

            const councilScores: CouncilScore[] = COUNCIL_ROLES.map(role => {
                const member = subCommitteeMembers.find(m => m.role === role);
                if (!member) return { role, score: null };

                const evalRecord = studentEvals.find(e => 
                    e.evaluatorId === member.supervisorId &&
                    e.evaluationType === 'internship' &&
                    e.rubricId === session.councilInternshipRubricId
                );
                return { role, score: evalRecord ? evalRecord.totalScore : null };
            });

            const validCouncilScores = councilScores.filter(s => s.score !== null).map(s => s.score as number);
            const councilInternAvg = validCouncilScores.length > 0 ? validCouncilScores.reduce((sum, score) => sum + score, 0) / validCouncilScores.length : null;

            let finalInternScore: number | null = null;
            if (councilInternAvg !== null && companySupervisorScore !== null) {
                finalInternScore = councilInternAvg * internCouncilWeight + companySupervisorScore * internCompanyWeight;
            }

            return {
                id: reg.id,
                studentId: reg.studentId,
                studentName: reg.studentName,
                companyName: reg.internship_companyName,
                subCommitteeName: subCommitteeDetails?.name || 'Chưa phân công',
                companySupervisorScore: companySupervisorScore,
                councilScores: councilScores,
                councilInternAvg: councilInternAvg,
                finalInternScore: finalInternScore,
                currentStatus: reg.internshipStatus,
            };
        });
    }
  }, [session, registrations, evaluations, subCommittees, reportType]);

  const filteredData = useMemo(() => {
      if (!processedData) return [];
      const term = searchTerm.toLowerCase();
      return processedData.filter(item => 
        item.studentName.toLowerCase().includes(term) ||
        item.studentId.toLowerCase().includes(term) ||
        (reportType === 'graduation' && (item as ProcessedGraduationData).projectTitle?.toLowerCase().includes(term)) ||
        (reportType === 'internship' && (item as ProcessedInternshipData).companyName?.toLowerCase().includes(term))
      );
  }, [processedData, searchTerm, reportType]);

  const exportToExcel = () => {
    let dataToExport;
    let fileName = `BangDiem_${session?.name.replace(/\s+/g, '_') || 'report'}.xlsx`;

    if (reportType === 'graduation') {
        fileName = `BangDiem_TotNghiep_${session?.name.replace(/\s+/g, '_') || 'report'}.xlsx`;
        dataToExport = (filteredData as ProcessedGraduationData[]).map(item => {
            const row: {[key: string]: any} = {
                'MSSV': item.studentId,
                'Họ và Tên': item.studentName,
                'Tên đề tài': item.projectTitle || 'N/A',
                'Tiểu ban': item.subCommitteeName,
                'Điểm GVHD': item.supervisorGradScore?.toFixed(2) ?? 'N/A',
            };
            COUNCIL_ROLES.forEach(role => {
                const score = item.councilScores.find(s => s.role === role);
                row[`Điểm ${roleDisplayNames[role]}`] = score?.score !== null ? score?.score?.toFixed(2) : 'N/A';
            });
            row['Điểm TB Hội đồng'] = item.councilGradAvg?.toFixed(2) ?? 'N/A';
            row['Điểm Tổng kết'] = item.finalGradScore?.toFixed(1) ?? 'N/A';
            return row;
        });
    } else {
        fileName = `BangDiem_ThucTap_${session?.name.replace(/\s+/g, '_') || 'report'}.xlsx`;
        dataToExport = (filteredData as ProcessedInternshipData[]).map(item => {
             const row: {[key: string]: any} = {
                'MSSV': item.studentId,
                'Họ và Tên': item.studentName,
                'Công ty Thực tập': item.companyName || 'N/A',
                'Tiểu ban': item.subCommitteeName,
                'Điểm ĐVTT': item.companySupervisorScore?.toFixed(2) ?? 'N/A',
            };
            COUNCIL_ROLES.forEach(role => {
                const score = item.councilScores.find(s => s.role === role);
                row[`Điểm ${roleDisplayNames[role]}`] = score?.score !== null ? score?.score?.toFixed(2) : 'N/A';
            });
            row['Điểm TB Hội đồng'] = item.councilInternAvg?.toFixed(2) ?? 'N/A';
            row['Điểm Tổng kết TT'] = item.finalInternScore?.toFixed(1) ?? 'N/A';
            return row;
        });
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BangDiem');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, fileName);
  };
  
  const openCopyDialog = (registrationId: string) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (registration) {
        setSelectedRegistration(registration);
        setIsCopyDialogOpen(true);
    }
  }


  const renderGraduationTable = () => (
    <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
        <TableRow>
            <TableHead className="w-12">STT</TableHead>
            <TableHead>MSSV</TableHead>
            <TableHead>Họ và Tên</TableHead>
            <TableHead>Tiểu ban</TableHead>
            <TableHead className="text-center">Điểm GVHD</TableHead>
            {COUNCIL_ROLES.map(role => (
                <TableHead key={role} className="text-center">Điểm {roleDisplayNames[role]}</TableHead>
            ))}
            <TableHead className="text-center">Điểm TB HĐ</TableHead>
            <TableHead className="text-center font-bold">Điểm Tổng kết</TableHead>
            <TableHead className="text-center">Hành động</TableHead>
        </TableRow>
        </TableHeader>
        <TableBody>
        {(filteredData as ProcessedGraduationData[]).length > 0 ? (
            (filteredData as ProcessedGraduationData[]).map((item, index) => (
            <TableRow key={item.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{item.studentId}</TableCell>
                <TableCell className="font-medium">{item.studentName}</TableCell>
                <TableCell>{item.subCommitteeName}</TableCell>
                <TableCell className="text-center">
                {item.supervisorGradScore !== null ? item.supervisorGradScore.toFixed(2) : '-'}
                </TableCell>
                {COUNCIL_ROLES.map(role => {
                    const scoreItem = item.councilScores.find(s => s.role === role);
                    return (
                        <TableCell key={role} className="text-center">
                            {scoreItem && scoreItem.score !== null ? scoreItem.score.toFixed(2) : '-'}
                        </TableCell>
                    )
                })}
                <TableCell className="text-center">
                {item.councilGradAvg !== null ? item.councilGradAvg.toFixed(2) : '-'}
                </TableCell>
                <TableCell className="text-center font-bold text-primary">
                {item.finalGradScore !== null ? item.finalGradScore.toFixed(1) : '-'}
                </TableCell>
                <TableCell className="text-center">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openCopyDialog(item.id)}>
                                <Copy className="mr-2 h-4 w-4" /> Sao chép điểm
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusUpdate(item.id, 'graduationStatus')} disabled={item.currentStatus === 'completed'}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Xác nhận Hoàn thành
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
            </TableRow>
            ))
        ) : (
            <TableRow>
            <TableCell colSpan={9 + COUNCIL_ROLES.length} className="text-center h-24">
                Không có dữ liệu để hiển thị.
            </TableCell>
            </TableRow>
        )}
        </TableBody>
    </Table>
  );

  const renderInternshipTable = () => (
      <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                  <TableHead className="w-12">STT</TableHead>
                  <TableHead>MSSV</TableHead>
                  <TableHead>Họ và Tên</TableHead>
                  <TableHead>Công ty Thực tập</TableHead>
                  <TableHead>Tiểu ban</TableHead>
                  <TableHead className="text-center">Điểm ĐVTT</TableHead>
                  {COUNCIL_ROLES.map(role => (
                    <TableHead key={role} className="text-center">Điểm {roleDisplayNames[role]}</TableHead>
                  ))}
                  <TableHead className="text-center">Điểm TB HĐ</TableHead>
                  <TableHead className="text-center font-bold">Điểm Tổng kết</TableHead>
                   <TableHead className="text-center">Hành động</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
              {(filteredData as ProcessedInternshipData[]).length > 0 ? (
                  (filteredData as ProcessedInternshipData[]).map((item, index) => (
                      <TableRow key={item.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item.studentId}</TableCell>
                          <TableCell className="font-medium">{item.studentName}</TableCell>
                          <TableCell>{item.companyName || 'N/A'}</TableCell>
                          <TableCell>{item.subCommitteeName}</TableCell>
                           <TableCell className="text-center">
                              {item.companySupervisorScore !== null ? item.companySupervisorScore.toFixed(2) : '-'}
                          </TableCell>
                           {COUNCIL_ROLES.map(role => {
                                const scoreItem = item.councilScores.find(s => s.role === role);
                                return (
                                    <TableCell key={role} className="text-center">
                                        {scoreItem && scoreItem.score !== null ? scoreItem.score.toFixed(2) : '-'}
                                    </TableCell>
                                )
                            })}
                           <TableCell className="text-center">
                              {item.councilInternAvg !== null ? item.councilInternAvg.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="text-center font-bold text-primary">
                              {item.finalInternScore !== null ? item.finalInternScore.toFixed(1) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openCopyDialog(item.id)}>
                                        <Copy className="mr-2 h-4 w-4" /> Sao chép điểm
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => handleStatusUpdate(item.id, 'internshipStatus')} disabled={item.currentStatus === 'completed'}>
                                        <CheckCircle className="mr-2 h-4 w-4" /> Xác nhận Hoàn thành
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                      </TableRow>
                  ))
              ) : (
                  <TableRow>
                      <TableCell colSpan={9 + COUNCIL_ROLES.length} className="text-center h-24">
                          Không có dữ liệu để hiển thị.
                      </TableCell>
                  </TableRow>
              )}
          </TableBody>
      </Table>
  );


  return (
    <>
        <Card className="mt-4">
        <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>Bảng điểm chi tiết: {reportType === 'graduation' ? 'Tốt nghiệp' : 'Thực tập'}</CardTitle>
                <CardDescription>
                Tổng hợp điểm {reportType === 'graduation' ? 'tốt nghiệp' : 'thực tập'} của sinh viên trong đợt báo cáo này.
                </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm kiếm..."
                    className="pl-8 w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
                <Button onClick={exportToExcel} variant="outline" className="w-full sm:w-auto">
                <FileDown className="mr-2 h-4 w-4" />
                Xuất Excel
                </Button>
            </div>
            </div>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[60vh] w-full">
            {reportType === 'graduation' ? renderGraduationTable() : renderInternshipTable()}
            </ScrollArea>
        </CardContent>
        </Card>
        <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
            <DialogContent>
                {selectedRegistration && session && (
                    <CopyEvaluationDialog
                        registration={selectedRegistration}
                        session={session}
                        evaluations={evaluations}
                        subCommittees={subCommittees}
                        reportType={reportType}
                        onFinished={() => setIsCopyDialogOpen(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    </>
  );
}
