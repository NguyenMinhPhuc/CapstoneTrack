
'use client';

import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
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
import { Search, FileDown, Link as LinkIcon } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { GraduationDefenseSession, DefenseRegistration, SubmissionReport } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function SubmissionReportTable() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('all');

  const sessionsQuery = useMemoFirebase(
    () => collection(firestore, 'graduationDefenseSessions'),
    [firestore]
  );
  const { data: sessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);

  const registrationsQuery = useMemoFirebase(
    () => collection(firestore, 'defenseRegistrations'),
    [firestore]
  );
  const { data: registrations, isLoading: isLoadingRegistrations } = useCollection<DefenseRegistration>(registrationsQuery);

  const isLoading = isLoadingSessions || isLoadingRegistrations;

  const processedData = useMemo(() => {
    if (!registrations || !sessions) return [];

    const sessionMap = new Map(sessions.map(s => [s.id, s.name]));

    return registrations
      .map((reg): SubmissionReport => ({
        ...reg,
        sessionName: sessionMap.get(reg.sessionId) || 'Không xác định',
      }))
      .filter(reg => {
        if (selectedSessionId !== 'all' && reg.sessionId !== selectedSessionId) {
          return false;
        }
        const term = searchTerm.toLowerCase();
        return (
          reg.studentName.toLowerCase().includes(term) ||
          reg.studentId.toLowerCase().includes(term) ||
          (reg.projectTitle && reg.projectTitle.toLowerCase().includes(term)) ||
          (reg.internship_companyName && reg.internship_companyName.toLowerCase().includes(term))
        );
      });
  }, [registrations, sessions, selectedSessionId, searchTerm]);

  const exportToExcel = () => {
    const dataToExport = processedData.map((item, index) => ({
      'STT': index + 1,
      'MSSV': item.studentId,
      'Họ và Tên': item.studentName,
      'Đợt báo cáo': item.sessionName,
      'Đề tài TN': item.projectTitle || '',
      'Công ty TT': item.internship_companyName || '',
      'Link báo cáo TN': item.reportLink || '',
      'Link báo cáo TT': item.internship_reportLink || '',
      'Link giấy tiếp nhận TT': item.internship_acceptanceLetterLink || '',
      'Link đơn đăng ký TT': item.internship_registrationFormLink || '',
      'Link đơn cam kết TT': item.internship_commitmentFormLink || '',
      'Link giấy nhận xét TT': item.internship_feedbackFormLink || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'HoSoDaNop');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 30 },
      { wch: 30 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 },
      { wch: 40 }, { wch: 40 },
    ];

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, 'BaoCao_HoSoDaNop.xlsx');
  };

  const renderLinkCell = (url: string | undefined) => {
    if (!url) return <span className="text-muted-foreground">-</span>;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              <LinkIcon className="h-4 w-4" />
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-sm">{url}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-2/3 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Danh sách Hồ sơ đã nộp</CardTitle>
            <CardDescription>
              Tổng hợp tất cả các hồ sơ đồ án tốt nghiệp và thực tập đã được sinh viên nộp lên hệ thống.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm sinh viên, đề tài, công ty..."
                className="pl-8 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Lọc theo đợt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả các đợt</SelectItem>
                {sessions?.map(session => (
                  <SelectItem key={session.id} value={session.id}>{session.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportToExcel} variant="outline" className="w-full sm:w-auto">
              <FileDown className="mr-2 h-4 w-4" />
              Xuất Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto rounded-md border max-h-[65vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>STT</TableHead>
                <TableHead>Sinh viên</TableHead>
                <TableHead>Đợt báo cáo</TableHead>
                <TableHead>Đề tài/Công ty</TableHead>
                <TableHead className="text-center">BC Tốt nghiệp</TableHead>
                <TableHead className="text-center">BC Thực tập</TableHead>
                <TableHead className="text-center">Giấy tiếp nhận</TableHead>
                <TableHead className="text-center">Đơn ĐK</TableHead>
                <TableHead className="text-center">Đơn cam kết</TableHead>
                <TableHead className="text-center">Giấy nhận xét</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.length > 0 ? (
                processedData.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                        <div>{item.studentName}</div>
                        <div className="text-xs text-muted-foreground">{item.studentId}</div>
                    </TableCell>
                    <TableCell>{item.sessionName}</TableCell>
                    <TableCell>
                        {item.projectTitle ? (
                           <div>
                                <p className="font-medium truncate max-w-xs">{item.projectTitle}</p>
                                <p className="text-xs text-muted-foreground">Đề tài Tốt nghiệp</p>
                           </div>
                        ) : item.internship_companyName ? (
                             <div>
                                <p className="font-medium truncate max-w-xs">{item.internship_companyName}</p>
                                <p className="text-xs text-muted-foreground">Thực tập Doanh nghiệp</p>
                           </div>
                        ) : '-'}
                    </TableCell>
                    <TableCell className="text-center">{renderLinkCell(item.reportLink)}</TableCell>
                    <TableCell className="text-center">{renderLinkCell(item.internship_reportLink)}</TableCell>
                    <TableCell className="text-center">{renderLinkCell(item.internship_acceptanceLetterLink)}</TableCell>
                    <TableCell className="text-center">{renderLinkCell(item.internship_registrationFormLink)}</TableCell>
                    <TableCell className="text-center">{renderLinkCell(item.internship_commitmentFormLink)}</TableCell>
                    <TableCell className="text-center">{renderLinkCell(item.internship_feedbackFormLink)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center h-24">
                    Không tìm thấy hồ sơ nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
