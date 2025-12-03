"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  FileDown,
  Link as LinkIcon,
  MoreHorizontal,
} from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type {
  GraduationDefenseSession,
  DefenseRegistration,
  SubmissionReport,
} from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusLabel: Record<string, string> = {
  ongoing: "Đang diễn ra",
  upcoming: "Sắp diễn ra",
  completed: "Đã hoàn thành",
};

export function SubmissionReportTable() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("ongoing");

  const sessionsQuery = useMemoFirebase(
    () => collection(firestore, "graduationDefenseSessions"),
    [firestore]
  );
  const { data: sessions, isLoading: isLoadingSessions } =
    useCollection<GraduationDefenseSession>(sessionsQuery);

  const registrationsQuery = useMemoFirebase(
    () => collection(firestore, "defenseRegistrations"),
    [firestore]
  );
  const { data: registrations, isLoading: isLoadingRegistrations } =
    useCollection<DefenseRegistration>(registrationsQuery);

  const isLoading = isLoadingSessions || isLoadingRegistrations;

  const groupedSessions = useMemo(() => {
    if (!sessions)
      return { ongoing: [], upcoming: [], completed: [] } as Record<
        GraduationDefenseSession["status"],
        GraduationDefenseSession[]
      >;
    return sessions.reduce(
      (acc, session) => {
        const arr = acc[session.status] || [];
        arr.push(session);
        acc[session.status] = arr;
        return acc;
      },
      { ongoing: [], upcoming: [], completed: [] } as Record<
        GraduationDefenseSession["status"],
        GraduationDefenseSession[]
      >
    );
  }, [sessions]);

  const processedData = useMemo(() => {
    if (!registrations || !sessions) return [];

    const sessionMap = new Map(sessions.map((s) => [s.id, s.name]));
    const sessionStatusMap = new Map(sessions.map((s) => [s.id, s.status]));

    return registrations
      .map(
        (reg): SubmissionReport => ({
          ...reg,
          sessionName: sessionMap.get(reg.sessionId) || "Không xác định",
        })
      )
      .filter((reg) => {
        if (selectedSessionId !== "all") {
          if (selectedSessionId === "ongoing") {
            const st = sessionStatusMap.get(reg.sessionId);
            if (st !== "ongoing") return false;
          } else if (reg.sessionId !== selectedSessionId) {
            return false;
          }
        }
        const term = searchTerm.toLowerCase();
        return (
          (reg.studentName || "").toLowerCase().includes(term) ||
          (reg.studentId || "").toLowerCase().includes(term) ||
          (reg.projectTitle && reg.projectTitle.toLowerCase().includes(term)) ||
          (reg.internship_companyName &&
            reg.internship_companyName.toLowerCase().includes(term))
        );
      });
  }, [registrations, sessions, selectedSessionId, searchTerm]);

  const createExportData = (data: SubmissionReport[]) => {
    return data.map((item, index) => ({
      STT: index + 1,
      MSSV: item.studentId,
      "Họ và Tên": item.studentName,
      Lớp: item.className || "",
      "Đợt báo cáo": item.sessionName,
      "Đề tài TN": item.projectTitle || "",
      "Công ty TT": item.internship_companyName || "",
      "Link báo cáo TN": item.reportLink || "",
      "Link báo cáo TT": item.internship_reportLink || "",
      "Link giấy tiếp nhận TT": item.internship_acceptanceLetterLink || "",
      "Link đơn đăng ký TT": item.internship_registrationFormLink || "",
      "Link đơn cam kết TT": item.internship_commitmentFormLink || "",
      "Link giấy nhận xét TT": item.internship_feedbackFormLink || "",
    }));
  };

  const exportToExcel = (data: SubmissionReport[], fileName: string) => {
    const dataToExport = createExportData(data);

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HoSoDaNop");

    // Set column widths
    worksheet["!cols"] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 25 },
      { wch: 30 },
      { wch: 30 },
      { wch: 40 },
      { wch: 40 },
      { wch: 40 },
      { wch: 40 },
      { wch: 40 },
      { wch: 40 },
    ];

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, fileName);
  };

  const handleExportAll = () => {
    exportToExcel(processedData, "BaoCao_HoSoDaNop.xlsx");
  };

  const handleExportSingle = (studentData: SubmissionReport) => {
    exportToExcel(
      [studentData],
      `HoSo_${studentData.studentId}_${studentData.studentName.replace(
        /\s+/g,
        "_"
      )}.xlsx`
    );
  };

  const renderLinkCell = (url: string | undefined, tooltip: string) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={!url ? "text-muted-foreground/30" : "text-primary"}
            >
              <LinkIcon className="h-4 w-4" />
            </span>
          </TooltipTrigger>
          {url && (
            <TooltipContent side="top">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:underline"
              >
                {tooltip}
                <span className="text-xs text-muted-foreground max-w-xs truncate">
                  {url}
                </span>
              </a>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  const {
    items: paginatedData,
    state: pageState,
    next,
    prev,
  } = usePagination(processedData, 50);

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
              Tổng hợp tất cả các hồ sơ đồ án tốt nghiệp và thực tập đã được
              sinh viên nộp lên hệ thống.
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
            <Select
              value={selectedSessionId}
              onValueChange={setSelectedSessionId}
            >
              <SelectTrigger className="w-full sm:w-[260px]">
                <SelectValue placeholder="Lọc theo đợt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả các đợt</SelectItem>
                <SelectItem value="ongoing">Các đợt đang diễn ra</SelectItem>
                {Object.entries(groupedSessions).map(
                  ([status, sessionList]) =>
                    sessionList.length > 0 && (
                      <div key={status}>
                        <div className="px-2 py-1 text-xs text-muted-foreground">
                          {statusLabel[status] || status}
                        </div>
                        {sessionList.map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            {session.name}
                          </SelectItem>
                        ))}
                      </div>
                    )
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleExportAll}
              variant="outline"
              className="w-full sm:w-auto"
            >
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
                <TableHead>Lớp</TableHead>
                <TableHead>Đợt báo cáo</TableHead>
                <TableHead>Đề tài/Công ty</TableHead>
                <TableHead className="text-center">Minh chứng</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{pageState.startIndex + index + 1}</TableCell>
                    <TableCell>
                      <div>{item.studentName}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.studentId}
                      </div>
                    </TableCell>
                    <TableCell>{item.className || "—"}</TableCell>
                    <TableCell>{item.sessionName}</TableCell>
                    <TableCell>
                      {item.projectTitle ? (
                        <div>
                          <p className="font-medium truncate max-w-xs">
                            {item.projectTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Đề tài Tốt nghiệp
                          </p>
                        </div>
                      ) : item.internship_companyName ? (
                        <div>
                          <p className="font-medium truncate max-w-xs">
                            {item.internship_companyName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Thực tập Doanh nghiệp
                          </p>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center items-center gap-4">
                        {renderLinkCell(item.reportLink, "Báo cáo Tốt nghiệp")}
                        {renderLinkCell(
                          item.internship_reportLink,
                          "Báo cáo Thực tập"
                        )}
                        {renderLinkCell(
                          item.internship_acceptanceLetterLink,
                          "Giấy tiếp nhận"
                        )}
                        {renderLinkCell(
                          item.internship_registrationFormLink,
                          "Đơn đăng ký"
                        )}
                        {renderLinkCell(
                          item.internship_commitmentFormLink,
                          "Đơn cam kết"
                        )}
                        {renderLinkCell(
                          item.internship_feedbackFormLink,
                          "Giấy nhận xét"
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleExportSingle(item)}
                          >
                            <FileDown className="mr-2 h-4 w-4" />
                            <span>Xuất Excel</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    Không tìm thấy hồ sơ nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <PaginationControls state={pageState} onPrev={prev} onNext={next} />
    </Card>
  );
}
