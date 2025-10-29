'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Search, FileDown, Copy, MoreHorizontal, CheckCircle, RefreshCw, XCircle, ArrowUpDown } from 'lucide-react';
import type { GraduationDefenseSession, DefenseRegistration, Evaluation, DefenseSubCommittee, SubCommitteeMember } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent } from './ui/dialog';
import { CopyEvaluationDialog } from './copy-evaluation-dialog';
import { doc, writeBatch } from 'firebase/firestore';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';


interface CouncilScore {
    role: string;
    score: number | null;
}

interface ProcessedGraduationData {
  id: string;
  studentId: string;
  studentDocId: string;
  studentName: string;
  projectTitle?: string;
  subCommitteeName: string;
  subCommitteeId?: string;
  supervisorGradScore: number | null;
  councilScores: CouncilScore[];
  councilGradAvg: number | null;
  finalGradScore: number | null;
  notes: string;
}

interface ProcessedInternshipData {
    id: string;
    studentId: string;
    studentDocId: string;
    studentName: string;
    companyName?: string;
    subCommitteeName: string;
    subCommitteeId?: string;
    companySupervisorScore: number | null;
    councilScores: CouncilScore[];
    councilInternAvg: number | null;
    finalInternScore: number | null;
    notes: string;
}

type SortKey = 'studentName' | 'studentId' | 'subCommitteeName' | 'supervisorGradScore' | 'companySupervisorScore' | 'councilGradAvg' | 'councilInternAvg' | 'finalGradScore' | 'finalInternScore';
type SortDirection = 'asc' | 'desc';


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
  const [subcommitteeFilter, setSubcommitteeFilter] = useState('all');
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<DefenseRegistration | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

    const handleBatchStatusUpdate = async (registrationIds: string[], status: 'completed' | 'withdrawn') => {
        if (registrationIds.length === 0) return;

        const batch = writeBatch(firestore);

        const registrationStatusKey = reportType === 'graduation' ? 'graduationStatus' : 'internshipStatus';
        const studentStatusKey = reportType === 'graduation' ? 'graduationStatus' : 'internshipStatus';
        const newStudentStatus = status === 'completed' ? 'achieved' : 'not_achieved';

        registrationIds.forEach(id => {
            const regDocRef = doc(firestore, 'defenseRegistrations', id);
            batch.update(regDocRef, { [registrationStatusKey]: status });
            
            // Also update the main student record
            const registration = registrations.find(r => r.id === id);
            if (registration) {
                 const studentDocRef = doc(firestore, 'students', registration.studentDocId);
                 batch.update(studentDocRef, { [studentStatusKey]: newStudentStatus });
            }
        });

        try {
            await batch.commit();
            toast({
                title: 'Thành công',
                description: `Đã cập nhật trạng thái cho ${registrationIds.length} sinh viên.`,
            });
            setSelectedRowIds([]);
        } catch (error) {
            console.error("Error updating statuses:", error);
            const contextualError = new FirestorePermissionError({
                path: 'batch update defenseRegistrations/students',
                operation: 'update',
                requestResourceData: { [registrationStatusKey]: status },
            });
            errorEmitter.emit('permission-error', contextualError);
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể cập nhật trạng thái.'});
        }
    }


  const processedData = useMemo(() => {
    if (!session) return [];
    const subCommitteeMap = new Map(subCommittees.map(sc => [sc.id, { name: sc.name, members: sc.members }]));

    if (reportType === 'graduation') {
        const gradCouncilWeight = (session.graduationCouncilWeight ?? 80) / 100;
        const gradSupervisorWeight = 1 - gradCouncilWeight;
        
        return registrations
            .map((reg): ProcessedGraduationData => {
            
            const studentEvals = evaluations.filter(e => e.registrationId === reg.id);
            const subCommitteeDetails = reg.subCommitteeId ? subCommitteeMap.get(reg.subCommitteeId) : undefined;
            const subCommitteeMembers = subCommitteeDetails?.members || [];
            
            let notes: string[] = [];
            if(reg.graduationStatus === 'withdrawn' && reg.graduationStatusNote) {
                notes.push(`Bỏ báo cáo: ${reg.graduationStatusNote}`);
            }

            if (reg.graduationStatus === 'withdrawn') {
                 return {
                    id: reg.id, studentId: reg.studentId, studentDocId: reg.studentDocId, studentName: reg.studentName,
                    projectTitle: reg.projectTitle, 
                    subCommitteeId: reg.subCommitteeId,
                    subCommitteeName: 'N/A',
                    supervisorGradScore: 0, councilScores: COUNCIL_ROLES.map(role => ({ role, score: 0 })),
                    councilGradAvg: 0, finalGradScore: 0, notes: notes.join('; '),
                };
            }

            const supervisorGradEval = studentEvals.find(e => 
                e.evaluatorId === reg.supervisorId && 
                e.evaluationType === 'graduation' &&
                e.rubricId === session.supervisorGraduationRubricId
            );
            const supervisorGradScore = supervisorGradEval ? supervisorGradEval.totalScore : null;
            
            const councilScores: CouncilScore[] = COUNCIL_ROLES.map(role => {
                const member = subCommitteeMembers.find(m => m.role === role);
                if (!member) return { role, score: null };

                const evalRecord = studentEvals.find(e => 
                    e.evaluatorId === member.supervisorId &&
                    e.evaluationType === 'graduation' &&
                    e.rubricId === session.councilGraduationRubricId
                );

                if (evalRecord?.attendance === 'absent') {
                    notes.push(`Vắng (HĐ - ${member.name})`);
                    return { role, score: 0 };
                }

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
                studentDocId: reg.studentDocId,
                studentName: reg.studentName,
                projectTitle: reg.projectTitle,
                subCommitteeId: reg.subCommitteeId,
                subCommitteeName: subCommitteeDetails?.name || 'Chưa phân công',
                supervisorGradScore: supervisorGradScore,
                councilScores: councilScores,
                councilGradAvg: councilGradAvg,
                finalGradScore: finalGradScore,
                notes: notes.join('; '),
            };
        });
    } else { // internship report
        const internCouncilWeight = (session.internshipCouncilWeight ?? 50) / 100;
        const internCompanyWeight = 1 - internCouncilWeight;
        return registrations
        .map((reg): ProcessedInternshipData => {
            const studentEvals = evaluations.filter(e => e.registrationId === reg.id);
            const subCommitteeDetails = reg.subCommitteeId ? subCommitteeMap.get(reg.subCommitteeId) : undefined;
            const subCommitteeMembers = subCommitteeDetails?.members || [];
            
            let notes: string[] = [];
            if(reg.internshipStatus === 'withdrawn' && reg.internshipStatusNote) {
                notes.push(`Bỏ báo cáo: ${reg.internshipStatusNote}`);
            }

            if (reg.internshipStatus === 'withdrawn') {
                return {
                    id: reg.id, studentId: reg.studentId, studentDocId: reg.studentDocId, studentName: reg.studentName,
                    companyName: reg.internship_companyName, 
                    subCommitteeId: reg.subCommitteeId,
                    subCommitteeName: 'N/A',
                    companySupervisorScore: 0, councilScores: COUNCIL_ROLES.map(role => ({ role, score: 0 })),
                    councilInternAvg: 0, finalInternScore: 0, notes: notes.join('; '),
                }
            }

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

                 if (evalRecord?.attendance === 'absent') {
                    notes.push(`Vắng (HĐ - ${member.name})`);
                    return { role, score: 0 };
                }

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
                studentDocId: reg.studentDocId,
                studentName: reg.studentName,
                companyName: reg.internship_companyName,
                subCommitteeId: reg.subCommitteeId,
                subCommitteeName: subCommitteeDetails?.name || 'Chưa phân công',
                companySupervisorScore: companySupervisorScore,
                councilScores: councilScores,
                councilInternAvg: councilInternAvg,
                finalInternScore: finalInternScore,
                notes: notes.join('; '),
            };
        });
    }
  }, [session, registrations, evaluations, subCommittees, reportType]);

  const sortedAndFilteredData = useMemo(() => {
    if (!processedData) return [];

    let filtered = processedData.filter(item => {
        const term = searchTerm.toLowerCase();
        const searchMatch = item.studentName.toLowerCase().includes(term) ||
          item.studentId.toLowerCase().includes(term) ||
          (reportType === 'graduation' && (item as ProcessedGraduationData).projectTitle?.toLowerCase().includes(term)) ||
          (reportType === 'internship' && (item as ProcessedInternshipData).companyName?.toLowerCase().includes(term));

        const subcommitteeMatch = subcommitteeFilter === 'all' || item.subCommitteeId === subcommitteeFilter;

        return searchMatch && subcommitteeMatch;
    });

    if (sortConfig !== null) {
        filtered.sort((a, b) => {
            const aValue = a[sortConfig.key] ?? null;
            const bValue = b[sortConfig.key] ?? null;

            if (aValue === null) return 1;
            if (bValue === null) return -1;
            
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            } else {
                 if (String(aValue) < String(bValue)) return sortConfig.direction === 'asc' ? -1 : 1;
                if (String(aValue) > String(bValue)) return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    return filtered;

  }, [processedData, searchTerm, subcommitteeFilter, sortConfig, reportType]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    }
    return sortConfig.direction === 'asc' ? <ArrowUpDown className="ml-2 h-4 w-4" /> : <ArrowUpDown className="ml-2 h-4 w-4" />;
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
        setSelectedRowIds(sortedAndFilteredData?.map(s => s.id) || []);
    } else {
        setSelectedRowIds([]);
    }
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    if (checked) {
        setSelectedRowIds(prev => [...prev, id]);
    } else {
        setSelectedRowIds(prev => prev.filter(rowId => rowId !== id));
    }
  };

  const isAllSelected = sortedAndFilteredData && selectedRowIds.length > 0 && selectedRowIds.length === sortedAndFilteredData.length;
  const isSomeSelected = selectedRowIds.length > 0 && (!sortedAndFilteredData || selectedRowIds.length < sortedAndFilteredData.length);


  const exportToExcel = () => {
    let dataToExport;
    let fileName = `BangDiem_${session?.name.replace(/\s+/g, '_') || 'report'}.xlsx`;

    if (reportType === 'graduation') {
        fileName = `BangDiem_TotNghiep_${session?.name.replace(/\s+/g, '_') || 'report'}.xlsx`;
        dataToExport = (sortedAndFilteredData as ProcessedGraduationData[]).map(item => {
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
            row['Ghi chú'] = item.notes;
            return row;
        });
    } else {
        fileName = `BangDiem_ThucTap_${session?.name.replace(/\s+/g, '_') || 'report'}.xlsx`;
        dataToExport = (sortedAndFilteredData as ProcessedInternshipData[]).map(item => {
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
            row['Ghi chú'] = item.notes;
            return row;
        });
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BangDiem');
    
    // Auto-fit columns
    const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
        wch: Math.max(key.length, ...dataToExport.map(row => String(row[key]).length)) + 2
    }));
    worksheet['!cols'] = colWidths;


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
            <TableHead className="w-12">
                <Checkbox
                    checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                    onCheckedChange={handleSelectAll}
                />
            </TableHead>
            <TableHead><Button variant="ghost" onClick={() => requestSort('studentId')} className="px-0 hover:bg-transparent">MSSV {getSortIcon('studentId')}</Button></TableHead>
            <TableHead><Button variant="ghost" onClick={() => requestSort('studentName')} className="px-0 hover:bg-transparent">Họ và Tên {getSortIcon('studentName')}</Button></TableHead>
            <TableHead><Button variant="ghost" onClick={() => requestSort('subCommitteeName')} className="px-0 hover:bg-transparent">Tiểu ban {getSortIcon('subCommitteeName')}</Button></TableHead>
            <TableHead className="text-center"><Button variant="ghost" onClick={() => requestSort('supervisorGradScore')} className="px-0 hover:bg-transparent">Điểm GVHD {getSortIcon('supervisorGradScore')}</Button></TableHead>
            {COUNCIL_ROLES.map(role => (
                <TableHead key={role} className="text-center">Điểm {roleDisplayNames[role]}</TableHead>
            ))}
            <TableHead className="text-center"><Button variant="ghost" onClick={() => requestSort('councilGradAvg')} className="px-0 hover:bg-transparent">Điểm TB HĐ {getSortIcon('councilGradAvg')}</Button></TableHead>
            <TableHead className="text-center font-bold"><Button variant="ghost" onClick={() => requestSort('finalGradScore')} className="px-0 hover:bg-transparent">Điểm Tổng kết {getSortIcon('finalGradScore')}</Button></TableHead>
            <TableHead>Ghi chú</TableHead>
            <TableHead className="text-center">Hành động</TableHead>
        </TableRow>
        </TableHeader>
        <TableBody>
        {(sortedAndFilteredData as ProcessedGraduationData[]).length > 0 ? (
            (sortedAndFilteredData as ProcessedGraduationData[]).map((item) => (
            <TableRow key={item.id} data-state={selectedRowIds.includes(item.id) && "selected"}>
                 <TableCell>
                    <Checkbox
                        checked={selectedRowIds.includes(item.id)}
                        onCheckedChange={(checked) => handleRowSelect(item.id, !!checked)}
                    />
                </TableCell>
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
                <TableCell className="text-xs text-muted-foreground">{item.notes}</TableCell>
                <TableCell className="text-center">
                     <Button variant="ghost" size="icon" onClick={() => openCopyDialog(item.id)}>
                        <Copy className="h-4 w-4" />
                    </Button>
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
                   <TableHead className="w-12">
                      <Checkbox
                          checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                          onCheckedChange={handleSelectAll}
                      />
                  </TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('studentId')} className="px-0 hover:bg-transparent">MSSV {getSortIcon('studentId')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('studentName')} className="px-0 hover:bg-transparent">Họ và Tên {getSortIcon('studentName')}</Button></TableHead>
                  <TableHead>Công ty Thực tập</TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('subCommitteeName')} className="px-0 hover:bg-transparent">Tiểu ban {getSortIcon('subCommitteeName')}</Button></TableHead>
                  <TableHead className="text-center"><Button variant="ghost" onClick={() => requestSort('companySupervisorScore')} className="px-0 hover:bg-transparent">Điểm ĐVTT {getSortIcon('companySupervisorScore')}</Button></TableHead>
                  {COUNCIL_ROLES.map(role => (
                    <TableHead key={role} className="text-center">Điểm {roleDisplayNames[role]}</TableHead>
                  ))}
                  <TableHead className="text-center"><Button variant="ghost" onClick={() => requestSort('councilInternAvg')} className="px-0 hover:bg-transparent">Điểm TB HĐ {getSortIcon('councilInternAvg')}</Button></TableHead>
                  <TableHead className="text-center font-bold"><Button variant="ghost" onClick={() => requestSort('finalInternScore')} className="px-0 hover:bg-transparent">Điểm Tổng kết {getSortIcon('finalInternScore')}</Button></TableHead>
                   <TableHead>Ghi chú</TableHead>
                   <TableHead className="text-center">Hành động</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
              {(sortedAndFilteredData as ProcessedInternshipData[]).length > 0 ? (
                  (sortedAndFilteredData as ProcessedInternshipData[]).map((item) => (
                      <TableRow key={item.id} data-state={selectedRowIds.includes(item.id) && "selected"}>
                          <TableCell>
                              <Checkbox
                                  checked={selectedRowIds.includes(item.id)}
                                  onCheckedChange={(checked) => handleRowSelect(item.id, !!checked)}
                              />
                          </TableCell>
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
                          <TableCell className="text-xs text-muted-foreground">{item.notes}</TableCell>
                          <TableCell className="text-center">
                             <Button variant="ghost" size="icon" onClick={() => openCopyDialog(item.id)}>
                                <Copy className="h-4 w-4" />
                            </Button>
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
                    className="pl-8 w-full sm:w-48"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
                 <Select value={subcommitteeFilter} onValueChange={setSubcommitteeFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Lọc theo tiểu ban" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả tiểu ban</SelectItem>
                        {subCommittees?.map(sc => (
                            <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                        ))}
                    </SelectContent>
                 </Select>
                <Button onClick={exportToExcel} variant="outline" className="w-full sm:w-auto">
                <FileDown className="mr-2 h-4 w-4" />
                Xuất Excel
                </Button>
            </div>
            </div>
            {selectedRowIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-4">
                    <span className="text-sm text-muted-foreground">Đã chọn {selectedRowIds.length} sinh viên:</span>
                    <Button size="sm" onClick={() => handleBatchStatusUpdate(selectedRowIds, 'completed')}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Xác nhận Hoàn thành
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleBatchStatusUpdate(selectedRowIds, 'withdrawn')}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Chuyển sang 'Bỏ báo cáo'
                    </Button>
                </div>
            )}
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
