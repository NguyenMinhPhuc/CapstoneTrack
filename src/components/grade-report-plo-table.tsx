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

type EvaluationSource = 'council' | 'supervisor' | 'company';

interface GradeReportPloTableProps {
  reportType: 'graduation' | 'internship';
  evaluationSource: EvaluationSource;
  registrations: DefenseRegistration[];
  evaluations: Evaluation[];
  rubric: Rubric | null | undefined;
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


export function GradeReportPloTable({ reportType, evaluationSource, registrations, evaluations, rubric }: GradeReportPloTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, headers } = useMemo(() => {
    if (!rubric) return { data: [], headers: [] };

    const cloToPiMap = new Map<string, string>();
    const piToCloMap = new Map<string, Set<string>>();
    const criterionToCloMap = new Map<string, string>();

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
    
    const sortedPis = Array.from(piToCloMap.keys()).sort();
    
    const headerStructure: HeaderStructure[] = sortedPis.map(pi => ({
        pi,
        clos: Array.from(piToCloMap.get(pi)!).sort(),
    }));

    const rubricId = rubric.id;

    const processedData: ProcessedPloData[] = registrations
        .filter(reg => reportType === 'graduation' ? reg.graduationStatus === 'reporting' : reg.internshipStatus === 'reporting')
        .map(reg => {
            // Filter evaluations based on the source (council or supervisor)
            const studentEvals = evaluations.filter(e => {
                if (e.registrationId !== reg.id || e.evaluationType !== reportType || e.rubricId !== rubricId) {
                    return false;
                }
                if (evaluationSource === 'supervisor') {
                    return e.evaluatorId === reg.supervisorId;
                }
                 if (evaluationSource === 'company') {
                    return e.evaluatorId === reg.internshipSupervisorId;
                }
                // For council, we don't filter by a single evaluatorId, we average them
                if (evaluationSource === 'council') {
                    return true;
                }
                return false;
            });

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
  }, [registrations, evaluations, rubric, reportType, evaluationSource]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    const term = searchTerm.toLowerCase();
    return data.filter(item =>
      item.studentName.toLowerCase().includes(term) ||
      item.studentId.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);
  
  const allClos = headers.flatMap(h => h.clos);

  const exportToExcel = () => {
    const reportName = `${reportType === 'graduation' ? 'TotNghiep' : 'ThucTap'}_${evaluationSource}`;
    const fileName = `BangDiem_CDR_${reportName}.xlsx`;

    // Create header rows
    const headerRow1: any[] = [{ v: 'STT', s: { font: { bold: true }}}, { v: 'MSSV', s: { font: { bold: true }}}, { v: 'Họ và Tên', s: { font: { bold: true }}}];
    const headerRow2: any[] = [null, null, null];
    const merges: XLSX.Range[] = [];

    let colIndex = 3;
    headers.forEach(header => {
      if (header.clos.length > 0) {
        headerRow1[colIndex] = { v: header.pi, s: { font: { bold: true }, alignment: { horizontal: 'center' }}};
        merges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + header.clos.length - 1 }});
        header.clos.forEach(clo => {
          headerRow1[colIndex + 1] = null; // Placeholder for merge
          headerRow2[colIndex] = { v: clo, s: { font: { bold: true }}};
          colIndex++;
        });
      }
    });

    // Create data rows
    const dataRows = filteredData.map((item, index) => {
        const row = [index + 1, item.studentId, item.studentName];
        headers.forEach(header => {
            header.clos.forEach(clo => {
                const score = item[clo];
                row.push(score !== undefined && score !== null ? score.toFixed(2) : '-');
            })
        })
        return row;
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);
    worksheet['!merges'] = merges;
    
    // Set column widths (optional but good for readability)
    const colWidths = [
      { wch: 5 }, // STT
      { wch: 12 }, // MSSV
      { wch: 25 }, // Họ và Tên
    ];
     headers.forEach(header => {
        header.clos.forEach(() => {
          colWidths.push({ wch: 10 }); // Width for CLO columns
        });
      });
    worksheet['!cols'] = colWidths;


    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Diem_CDR');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, fileName);
  };

  const getCardDescription = () => {
    let typeDesc = reportType === 'graduation' ? 'Tốt nghiệp' : 'Thực tập';
    let sourceDesc = '';
    switch(evaluationSource) {
        case 'council': sourceDesc = 'Hội đồng'; break;
        case 'supervisor': sourceDesc = 'GVHD'; break;
        case 'company': sourceDesc = 'Đơn vị thực tập'; break;
    }
    return `Điểm trung bình của sinh viên cho từng CLO được định nghĩa trong rubric của ${sourceDesc} chấm ${typeDesc}.`;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Báo cáo điểm theo Chuẩn đầu ra (CĐR)</CardTitle>
            <CardDescription>
              {getCardDescription()}
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
            <Button onClick={exportToExcel} variant="outline" className="w-full sm:w-auto" disabled={headers.length === 0}>
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
                    Không tìm thấy rubric hoặc thông tin PI/CLO nào được gán cho nguồn đánh giá này trong đợt báo cáo.
                </AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  );
}
