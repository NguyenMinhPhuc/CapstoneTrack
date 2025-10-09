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
import type { DefenseRegistration, Evaluation, Rubric } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { BarChart3 } from 'lucide-react';

interface GradeReportPloTableProps {
  reportType: 'graduation' | 'internship';
  registrations: DefenseRegistration[];
  evaluations: Evaluation[];
  rubrics: {
    councilGraduation?: Rubric | null;
    councilInternship?: Rubric | null;
    supervisorGraduation?: Rubric | null;
    companyInternship?: Rubric | null;
  };
}

interface ProcessedPloData {
    id: string;
    studentId: string;
    studentName: string;
    [key: string]: any; // For dynamic PLO/PI/CLO columns
}

export function GradeReportPloTable({ reportType, registrations, evaluations, rubrics }: GradeReportPloTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, headers } = useMemo(() => {
    let relevantRubrics: Rubric[] = [];
    if (reportType === 'graduation') {
        relevantRubrics = [rubrics.councilGraduation, rubrics.supervisorGraduation].filter((r): r is Rubric => !!r);
    } else { // internship
        relevantRubrics = [rubrics.councilInternship, rubrics.companyInternship].filter((r): r is Rubric => !!r);
    }

    if (relevantRubrics.length === 0) return { data: [], headers: { PLO: [], PI: [], CLO: [] } };

    const uniqueHeaders = { PLO: new Set<string>(), PI: new Set<string>(), CLO: new Set<string>() };
    const rubricMap = new Map<string, { type: 'PLO' | 'PI' | 'CLO', value: string }[]>();

    relevantRubrics.forEach(rubric => {
      rubric.criteria.forEach(criterion => {
        if (!rubricMap.has(criterion.id)) {
            rubricMap.set(criterion.id, []);
        }
        const mapping = rubricMap.get(criterion.id)!;

        if (criterion.PLO) { uniqueHeaders.PLO.add(criterion.PLO); mapping.push({ type: 'PLO', value: criterion.PLO }); }
        if (criterion.PI) { uniqueHeaders.PI.add(criterion.PI); mapping.push({ type: 'PI', value: criterion.PI }); }
        if (criterion.CLO) { uniqueHeaders.CLO.add(criterion.CLO); mapping.push({ type: 'CLO', value: criterion.CLO }); }
      });
    });

    const relevantRubricIds = new Set(relevantRubrics.map(r => r.id));

    const processedData: ProcessedPloData[] = registrations
        .filter(reg => reportType === 'graduation' ? reg.graduationStatus === 'reporting' : reg.internshipStatus === 'reporting')
        .map(reg => {
            const studentEvals = evaluations.filter(e => e.registrationId === reg.id && e.evaluationType === reportType && relevantRubricIds.has(e.rubricId));
            const studentPloScores: Record<string, { total: number; count: number }> = {};

            studentEvals.forEach(evaluation => {
                evaluation.scores.forEach(scoreItem => {
                const mappings = rubricMap.get(scoreItem.criterionId);
                if (mappings) {
                    mappings.forEach(mapping => {
                    const key = `${mapping.type}_${mapping.value}`;
                    if (!studentPloScores[key]) {
                        studentPloScores[key] = { total: 0, count: 0 };
                    }
                    studentPloScores[key].total += scoreItem.score;
                    studentPloScores[key].count += 1;
                    });
                }
                });
            });
            
            const resultRow: ProcessedPloData = {
                id: reg.id,
                studentId: reg.studentId,
                studentName: reg.studentName,
            };

            Object.keys(studentPloScores).forEach(key => {
                const { total, count } = studentPloScores[key];
                resultRow[key] = count > 0 ? total / count : null;
            });

            return resultRow;
    });

    return { 
        data: processedData, 
        headers: {
            PLO: Array.from(uniqueHeaders.PLO).sort(),
            PI: Array.from(uniqueHeaders.PI).sort(),
            CLO: Array.from(uniqueHeaders.CLO).sort(),
        }
    };
  }, [registrations, evaluations, rubrics, reportType]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    const term = searchTerm.toLowerCase();
    return data.filter(item =>
      item.studentName.toLowerCase().includes(term) ||
      item.studentId.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);
  
  const allHeaders = [...headers.PLO, ...headers.PI, ...headers.CLO];

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Báo cáo điểm theo Chuẩn đầu ra (CĐR)</CardTitle>
            <CardDescription>
              Điểm trung bình của sinh viên cho từng PLO, PI, CLO được định nghĩa trong các rubric của học phần {reportType === 'graduation' ? 'Tốt nghiệp' : 'Thực tập'}.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm kiếm sinh viên..."
                className="pl-8 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="w-full sm:w-auto" disabled>
              <FileDown className="mr-2 h-4 w-4" />
              Xuất Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {allHeaders.length > 0 ? (
            <ScrollArea className="h-[60vh] w-full">
            <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                    <TableHead className="w-12">STT</TableHead>
                    <TableHead>MSSV</TableHead>
                    <TableHead>Họ và Tên</TableHead>
                    {headers.PLO.map(h => <TableHead key={`PLO_${h}`} className="text-center">{h}</TableHead>)}
                    {headers.PI.map(h => <TableHead key={`PI_${h}`} className="text-center">{h}</TableHead>)}
                    {headers.CLO.map(h => <TableHead key={`CLO_${h}`} className="text-center">{h}</TableHead>)}
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredData.map((item, index) => (
                    <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.studentId}</TableCell>
                        <TableCell className="font-medium">{item.studentName}</TableCell>
                         {headers.PLO.map(h => <TableCell key={`PLO_${h}`} className="text-center">{item[`PLO_${h}`] !== undefined && item[`PLO_${h}`] !== null ? item[`PLO_${h}`].toFixed(2) : '-'}</TableCell>)}
                         {headers.PI.map(h => <TableCell key={`PI_${h}`} className="text-center">{item[`PI_${h}`] !== undefined && item[`PI_${h}`] !== null ? item[`PI_${h}`].toFixed(2) : '-'}</TableCell>)}
                         {headers.CLO.map(h => <TableCell key={`CLO_${h}`} className="text-center">{item[`CLO_${h}`] !== undefined && item[`CLO_${h}`] !== null ? item[`CLO_${h}`].toFixed(2) : '-'}</TableCell>)}
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </ScrollArea>
        ) : (
             <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertTitle>Không có dữ liệu CĐR</AlertTitle>
                <AlertDescription>
                    Không tìm thấy thông tin PLO, PI, hoặc CLO nào trong các rubric được gán cho học phần {reportType === 'graduation' ? 'Tốt nghiệp' : 'Thực tập'} của đợt báo cáo này.
                </AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  );
}
