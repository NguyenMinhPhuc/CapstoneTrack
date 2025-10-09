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
import { cn } from '@/lib/utils';

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
    [key: string]: any; // For dynamic CLO scores
}

interface HeaderStructure {
    pi: string;
    clos: string[];
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

    if (relevantRubrics.length === 0) return { data: [], headers: [] };

    const cloToPiMap = new Map<string, string>();
    const piToCloMap = new Map<string, Set<string>>();
    const criterionToCloMap = new Map<string, string>();

    relevantRubrics.forEach(rubric => {
      rubric.criteria.forEach(criterion => {
        if (criterion.CLO && criterion.PI) {
            const clo = criterion.CLO.trim();
            const pi = criterion.PI.trim();
            
            cloToPiMap.set(clo, pi);
            criterionToCloMap.set(criterion.id, clo);

            if (!piToCloMap.has(pi)) {
                piToCloMap.set(pi, new Set());
            }
            piToCloMap.get(pi)!.add(clo);
        }
      });
    });

    const sortedPis = Array.from(piToCloMap.keys()).sort();
    
    const headerStructure: HeaderStructure[] = sortedPis.map(pi => ({
        pi,
        clos: Array.from(piToCloMap.get(pi)!).sort(),
    }));

    const relevantRubricIds = new Set(relevantRubrics.map(r => r.id));

    const processedData: ProcessedPloData[] = registrations
        .filter(reg => reportType === 'graduation' ? reg.graduationStatus === 'reporting' : reg.internshipStatus === 'reporting')
        .map(reg => {
            const studentEvals = evaluations.filter(e => e.registrationId === reg.id && e.evaluationType === reportType && relevantRubricIds.has(e.rubricId));
            const studentCloScores: Record<string, { total: number; count: number }> = {};

            studentEvals.forEach(evaluation => {
                evaluation.scores.forEach(scoreItem => {
                    const clo = criterionToCloMap.get(scoreItem.criterionId);
                    if (clo) {
                        if (!studentCloScores[clo]) {
                            studentCloScores[clo] = { total: 0, count: 0 };
                        }
                        studentCloScores[clo].total += scoreItem.score;
                        studentCloScores[clo].count += 1;
                    }
                });
            });
            
            const resultRow: ProcessedPloData = {
                id: reg.id,
                studentId: reg.studentId,
                studentName: reg.studentName,
            };

            Object.keys(studentCloScores).forEach(clo => {
                const { total, count } = studentCloScores[clo];
                resultRow[clo] = count > 0 ? total / count : null;
            });

            return resultRow;
    });

    return { 
        data: processedData, 
        headers: headerStructure,
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
  
  const allClos = headers.flatMap(h => h.clos);

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Báo cáo điểm theo Chuẩn đầu ra (CĐR)</CardTitle>
            <CardDescription>
              Điểm trung bình của sinh viên cho từng CLO được định nghĩa trong các rubric của học phần {reportType === 'graduation' ? 'Tốt nghiệp' : 'Thực tập'}.
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
        {headers.length > 0 ? (
            <ScrollArea className="h-[60vh] w-full">
            <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                        <TableHead rowSpan={2} className="w-12 align-bottom">STT</TableHead>
                        <TableHead rowSpan={2} className="align-bottom">MSSV</TableHead>
                        <TableHead rowSpan={2} className="align-bottom">Họ và Tên</TableHead>
                        {headers.map(header => (
                            <TableHead
                                key={header.pi}
                                colSpan={header.clos.length}
                                className="text-center border-l"
                            >
                                {header.pi}
                            </TableHead>
                        ))}
                    </TableRow>
                    <TableRow>
                         {headers.map(header => (
                            header.clos.map((clo, index) => (
                                <TableHead key={clo} className={cn("text-center", index === 0 && "border-l")}>
                                    {clo}
                                </TableHead>
                            ))
                         ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                {filteredData.map((item, index) => (
                    <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.studentId}</TableCell>
                        <TableCell className="font-medium">{item.studentName}</TableCell>
                         {headers.map(header => (
                            header.clos.map((clo, cloIndex) => (
                               <TableCell key={clo} className={cn("text-center", cloIndex === 0 && "border-l")}>
                                  {item[clo] !== undefined && item[clo] !== null ? item[clo].toFixed(2) : '-'}
                               </TableCell>
                            ))
                         ))}
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
                    Không tìm thấy thông tin PI hoặc CLO nào trong các rubric được gán cho học phần {reportType === 'graduation' ? 'Tốt nghiệp' : 'Thực tập'} của đợt báo cáo này.
                </AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  );
}
