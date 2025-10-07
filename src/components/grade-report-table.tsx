
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
import { Search, FileDown } from 'lucide-react';
import type { GraduationDefenseSession, DefenseRegistration, Evaluation, DefenseSubCommittee } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';

interface CouncilScore {
    role: string;
    score: number;
}

interface ProcessedStudentData {
  id: string;
  studentId: string;
  studentName: string;
  projectTitle?: string;
  subCommitteeName: string;
  supervisorGradScore: number | null;
  councilScores: CouncilScore[];
  councilGradAvg: number | null;
  finalGradScore: number | null;
}

interface GradeReportTableProps {
  session: GraduationDefenseSession | null;
  registrations: DefenseRegistration[];
  evaluations: Evaluation[];
  subCommittees: DefenseSubCommittee[];
}

export function GradeReportTable({ session, registrations, evaluations, subCommittees }: GradeReportTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const processedData = useMemo((): ProcessedStudentData[] => {
    if (!session) return [];

    const subCommitteeMap = new Map(subCommittees.map(sc => [sc.id, { name: sc.name, members: sc.members }]));

    return registrations
    .filter(reg => reg.registrationStatus === 'reporting')
    .map(reg => {
      const studentEvals = evaluations.filter(e => e.registrationId === reg.id);
      
      const supervisorGradEval = studentEvals.find(e => 
        e.evaluatorId === reg.supervisorId && 
        e.evaluationType === 'graduation' &&
        e.rubricId === session.supervisorGraduationRubricId
      );
      const supervisorGradScore = supervisorGradEval ? supervisorGradEval.totalScore : null;

      const subCommitteeDetails = reg.subCommitteeId ? subCommitteeMap.get(reg.subCommitteeId) : undefined;
      const subCommitteeMembers = subCommitteeDetails?.members || [];
      
      const councilScores: CouncilScore[] = [];
      if (subCommitteeMembers.length > 0) {
          subCommitteeMembers.forEach(member => {
              const evalRecord = studentEvals.find(e => 
                e.evaluatorId === member.supervisorId &&
                e.evaluationType === 'graduation' &&
                e.rubricId === session.councilGraduationRubricId
              );
              if (evalRecord) {
                  councilScores.push({ role: member.role, score: evalRecord.totalScore });
              }
          });
      }
      
      let councilGradAvg: number | null = null;
      if (councilScores.length > 0) {
        const total = councilScores.reduce((sum, s) => sum + s.score, 0);
        councilGradAvg = total / councilScores.length;
      }
      
      let finalGradScore: number | null = null;
      if (supervisorGradScore !== null && councilGradAvg !== null) {
          finalGradScore = supervisorGradScore * 0.4 + councilGradAvg * 0.6;
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
      };
    });
  }, [session, registrations, evaluations, subCommittees]);

  const uniqueCouncilRoles = useMemo(() => {
    const roles = new Set<string>();
    processedData.forEach(item => {
      item.councilScores.forEach(score => roles.add(score.role));
    });
    const roleOrder: Record<string, number> = { 'Head': 1, 'Secretary': 2, 'Commissioner': 3 };
    return Array.from(roles).sort((a,b) => (roleOrder[a] || 99) - (roleOrder[b] || 99) );
  }, [processedData]);

  const filteredData = useMemo(() => {
      if (!processedData) return [];
      const term = searchTerm.toLowerCase();
      return processedData.filter(item => 
        item.studentName.toLowerCase().includes(term) ||
        item.studentId.toLowerCase().includes(term) ||
        item.projectTitle?.toLowerCase().includes(term)
      );
  }, [processedData, searchTerm]);

  const exportToExcel = () => {
    const dataToExport = filteredData.map(item => {
        const row: {[key: string]: any} = {
            'MSSV': item.studentId,
            'Họ và Tên': item.studentName,
            'Tên đề tài': item.projectTitle || 'N/A',
            'Tiểu ban': item.subCommitteeName,
            'Điểm GVHD': item.supervisorGradScore?.toFixed(2) ?? 'N/A',
        };
        uniqueCouncilRoles.forEach(role => {
            const score = item.councilScores.find(s => s.role === role);
            row[`Điểm ${role}`] = score ? score.score.toFixed(2) : 'N/A';
        });
        row['Điểm TB Hội đồng'] = item.councilGradAvg?.toFixed(2) ?? 'N/A';
        row['Điểm Tổng kết'] = item.finalGradScore?.toFixed(2) ?? 'N/A';
        return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BangDiem');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `BangDiem_${session?.name.replace(/\s+/g, '_') || 'report'}.xlsx`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Bảng điểm chi tiết: {session?.name}</CardTitle>
            <CardDescription>
              Tổng hợp điểm tốt nghiệp của sinh viên trong đợt báo cáo này.
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
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-12">STT</TableHead>
                <TableHead>MSSV</TableHead>
                <TableHead>Họ và Tên</TableHead>
                <TableHead>Tiểu ban</TableHead>
                <TableHead className="text-center">Điểm GVHD</TableHead>
                {uniqueCouncilRoles.map(role => (
                    <TableHead key={role} className="text-center">Điểm {role}</TableHead>
                ))}
                <TableHead className="text-center">Điểm TB HĐ</TableHead>
                <TableHead className="text-center font-bold">Điểm Tổng kết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.studentId}</TableCell>
                    <TableCell className="font-medium">{item.studentName}</TableCell>
                    <TableCell>{item.subCommitteeName}</TableCell>
                    <TableCell className="text-center">
                      {item.supervisorGradScore !== null ? item.supervisorGradScore.toFixed(2) : '-'}
                    </TableCell>
                     {uniqueCouncilRoles.map(role => {
                        const scoreItem = item.councilScores.find(s => s.role === role);
                        return (
                            <TableCell key={role} className="text-center">
                                {scoreItem ? scoreItem.score.toFixed(2) : '-'}
                            </TableCell>
                        )
                     })}
                    <TableCell className="text-center">
                      {item.councilGradAvg !== null ? item.councilGradAvg.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell className="text-center font-bold text-primary">
                      {item.finalGradScore !== null ? item.finalGradScore.toFixed(2) : '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8 + uniqueCouncilRoles.length} className="text-center h-24">
                    Không có dữ liệu để hiển thị.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
