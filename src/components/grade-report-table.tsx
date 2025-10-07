
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

interface ProcessedStudentData {
  id: string;
  studentId: string;
  studentName: string;
  projectTitle?: string;
  subCommitteeName: string;
  supervisorGradScore: number | null;
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

    const subCommitteeMap = new Map(subCommittees.map(sc => [sc.id, sc.name]));

    return registrations
    .filter(reg => reg.registrationStatus === 'reporting')
    .map(reg => {
      const studentEvals = evaluations.filter(e => e.registrationId === reg.id);
      
      // Supervisor Graduation Score
      const supervisorGradEval = studentEvals.find(e => 
        e.evaluatorId === reg.supervisorId && 
        e.evaluationType === 'graduation' &&
        e.rubricId === session.supervisorGraduationRubricId
      );
      const supervisorGradScore = supervisorGradEval ? supervisorGradEval.totalScore : null;

      // Council Graduation Scores
      const subCommitteeMembers = subCommittees.find(sc => sc.id === reg.subCommitteeId)?.members.map(m => m.supervisorId) || [];
      const councilGradEvals = studentEvals.filter(e => 
        subCommitteeMembers.includes(e.evaluatorId) &&
        e.evaluationType === 'graduation' &&
        e.rubricId === session.councilGraduationRubricId
      );
      
      let councilGradAvg: number | null = null;
      if (councilGradEvals.length > 0) {
        const total = councilGradEvals.reduce((sum, e) => sum + e.totalScore, 0);
        councilGradAvg = total / councilGradEvals.length;
      }
      
      // Final Score Calculation (40% GVHD, 60% Hội đồng)
      let finalGradScore: number | null = null;
      if (supervisorGradScore !== null && councilGradAvg !== null) {
          finalGradScore = supervisorGradScore * 0.4 + councilGradAvg * 0.6;
      }

      return {
        id: reg.id,
        studentId: reg.studentId,
        studentName: reg.studentName,
        projectTitle: reg.projectTitle,
        subCommitteeName: reg.subCommitteeId ? subCommitteeMap.get(reg.subCommitteeId) || 'N/A' : 'Chưa phân công',
        supervisorGradScore: supervisorGradScore,
        councilGradAvg: councilGradAvg,
        finalGradScore: finalGradScore,
      };
    });
  }, [session, registrations, evaluations, subCommittees]);

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
    const dataToExport = filteredData.map(item => ({
      'MSSV': item.studentId,
      'Họ và Tên': item.studentName,
      'Tên đề tài': item.projectTitle || 'N/A',
      'Tiểu ban': item.subCommitteeName,
      'Điểm GVHD': item.supervisorGradScore?.toFixed(2) ?? 'N/A',
      'Điểm TB Hội đồng': item.councilGradAvg?.toFixed(2) ?? 'N/A',
      'Điểm Tổng kết': item.finalGradScore?.toFixed(2) ?? 'N/A',
    }));

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
                <TableHead>Tên đề tài</TableHead>
                <TableHead>Tiểu ban</TableHead>
                <TableHead className="text-center">Điểm GVHD</TableHead>
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
                    <TableCell>{item.projectTitle || 'N/A'}</TableCell>
                    <TableCell>{item.subCommitteeName}</TableCell>
                    <TableCell className="text-center">
                      {item.supervisorGradScore !== null ? item.supervisorGradScore.toFixed(2) : '-'}
                    </TableCell>
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
                  <TableCell colSpan={8} className="text-center h-24">
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
