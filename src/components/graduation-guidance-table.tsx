"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  PlusCircle,
  Check,
  X,
  Eye,
  FileSignature,
  Book,
  Target,
  CheckCircle,
  Link as LinkIcon,
  FileUp,
  Activity,
  AlertTriangle,
  Move,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  FileDown,
  Search,
} from "lucide-react";
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  errorEmitter,
  FirestorePermissionError,
} from "@/firebase";
import {
  collection,
  doc,
  deleteDoc,
  query,
  where,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import type {
  ProjectTopic,
  GraduationDefenseSession,
  DefenseRegistration,
} from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "./ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { ViewProgressDialog } from "./view-progress-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { ChevronsUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "./ui/pagination-controls";

interface GraduationGuidanceTableProps {
  supervisorId: string;
  userRole: "admin" | "supervisor";
}

type SortKey =
  | "studentName"
  | "projectTitle"
  | "proposalStatus"
  | "reportStatus";
type SortDirection = "asc" | "desc";

const proposalStatusVariant: Record<
  string,
  "outline" | "secondary" | "default" | "destructive"
> = {
  not_submitted: "outline",
  pending_approval: "secondary",
  approved: "default",
  rejected: "destructive",
};

const proposalStatusLabel: Record<string, string> = {
  not_submitted: "Chưa nộp TM",
  pending_approval: "Chờ duyệt TM",
  approved: "Đã duyệt TM",
  rejected: "TM bị từ chối",
};

const reportStatusVariant: Record<
  string,
  "outline" | "secondary" | "default" | "destructive"
> = {
  not_submitted: "outline",
  pending_approval: "secondary",
  approved: "default",
  rejected: "destructive",
};

const reportStatusLabel: Record<string, string> = {
  not_submitted: "Chưa nộp BC",
  pending_approval: "Chờ duyệt BC",
  approved: "Đã duyệt BC",
  rejected: "BC bị từ chối",
};

const statusLabel: Record<string, string> = {
  ongoing: "Đang diễn ra",
  upcoming: "Sắp diễn ra",
  completed: "Đã hoàn thành",
};

function RegistrationRow({
  registration,
  sessionMap,
  onAction,
}: {
  registration: DefenseRegistration;
  sessionMap: Map<string, string>;
  onAction: (
    type: "proposal" | "report" | "progress",
    reg: DefenseRegistration
  ) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const propStatus = registration.proposalStatus || "not_submitted";
  const propConfig = proposalStatusVariant[propStatus];
  const propLabel = proposalStatusLabel[propStatus];

  const reportStatus = registration.reportStatus || "not_submitted";
  const reportConfig = reportStatusVariant[reportStatus];
  const reportLabel = reportStatusLabel[reportStatus];

  return (
    <React.Fragment>
      <TableRow className="hover:bg-muted/50 data-[state=open]:bg-muted/50">
        <TableCell className="w-10/12 p-0" colSpan={3}>
          <Button
            variant="ghost"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full justify-start hover:bg-transparent px-4 py-4 h-auto"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform mr-2",
                isOpen && "rotate-180"
              )}
            />
            <div className="grid grid-cols-12 w-full text-left text-sm items-center gap-4">
              <div className="col-span-4 font-medium">
                <p>{registration.studentName}</p>
                <p className="text-xs text-muted-foreground">
                  {registration.studentId}
                </p>
              </div>
              <div
                className="col-span-5 truncate"
                title={registration.projectTitle}
              >
                <p className="font-medium">
                  {registration.projectTitle || "Chưa có"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {sessionMap.get(registration.sessionId)}
                </p>
              </div>
              <div className="col-span-3">
                <div className="flex flex-col gap-1.5 items-start">
                  <Badge variant={propConfig}>{propLabel}</Badge>
                  <Badge variant={reportConfig}>{reportLabel}</Badge>
                </div>
              </div>
            </div>
          </Button>
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
                onClick={() => onAction("progress", registration)}
              >
                <Activity className="mr-2 h-4 w-4" /> Xem tiến độ
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onAction("proposal", registration)}
                disabled={propStatus === "not_submitted"}
              >
                <Eye className="mr-2 h-4 w-4" /> Xem thuyết minh
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onAction("report", registration)}
                disabled={reportStatus === "not_submitted"}
              >
                <Eye className="mr-2 h-4 w-4" /> Xem báo cáo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-muted/30 hover:bg-muted/40">
          <TableCell colSpan={4} className="p-0">
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <h4 className="font-semibold flex items-center gap-2 text-base">
                  <Book className="h-4 w-4 text-primary" /> Tóm tắt
                </h4>
                <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {registration.summary || ""}
                  </ReactMarkdown>
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold flex items-center gap-2 text-base">
                  <Target className="h-4 w-4 text-primary" /> Mục tiêu
                </h4>
                <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {registration.objectives || ""}
                  </ReactMarkdown>
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold flex items-center gap-2 text-base">
                  <CheckCircle className="h-4 w-4 text-primary" /> Kết quả mong
                  đợi
                </h4>
                <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {registration.expectedResults || ""}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
}

export function GraduationGuidanceTable({
  supervisorId,
  userRole,
}: GraduationGuidanceTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("ongoing"); // Default to ongoing
  const [proposalStatusFilter, setProposalStatusFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  } | null>(null);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] =
    useState<DefenseRegistration | null>(null);
  const [isSessionPopoverOpen, setIsSessionPopoverOpen] = useState(false);

  const sessionsQuery = useMemoFirebase(
    () => collection(firestore, "graduationDefenseSessions"),
    [firestore]
  );
  const { data: sessions, isLoading: isLoadingSessions } =
    useCollection<GraduationDefenseSession>(sessionsQuery);

  const graduationSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter(
      (s) => s.sessionType === "graduation" || s.sessionType === "combined"
    );
  }, [sessions]);

  const registrationsQuery = useMemoFirebase(() => {
    let q: Query = collection(firestore, "defenseRegistrations");

    const conditions = [];

    if (userRole === "supervisor") {
      conditions.push(where("supervisorId", "==", supervisorId));
    }

    if (selectedSessionId === "ongoing") {
      const ongoingSessionIds = graduationSessions
        .filter((s) => s.status === "ongoing")
        .map((s) => s.id);
      if (ongoingSessionIds.length > 0) {
        conditions.push(where("sessionId", "in", ongoingSessionIds));
      } else {
        conditions.push(where("sessionId", "==", "__impossible_value__"));
      }
    } else if (selectedSessionId !== "all") {
      conditions.push(where("sessionId", "==", selectedSessionId));
    } else {
      const gradSessionIds = graduationSessions.map((s) => s.id);
      if (gradSessionIds.length > 0) {
        conditions.push(where("sessionId", "in", gradSessionIds));
      } else {
        conditions.push(where("sessionId", "==", "__impossible_value__"));
      }
    }

    conditions.push(where("graduationStatus", "==", "reporting"));

    return query(q, ...conditions);
  }, [
    firestore,
    supervisorId,
    selectedSessionId,
    userRole,
    graduationSessions,
  ]);

  const { data: registrations, isLoading: isLoadingRegistrations } =
    useCollection<DefenseRegistration>(registrationsQuery);

  const isLoading = isLoadingSessions || isLoadingRegistrations;

  const sessionMap = useMemo(() => {
    if (!sessions) return new Map();
    return new Map(sessions.map((s) => [s.id, s.name]));
  }, [sessions]);

  const groupedSessions = useMemo(() => {
    if (!graduationSessions)
      return { ongoing: [], upcoming: [], completed: [] };
    return graduationSessions.reduce((acc, session) => {
      const group = acc[session.status] || [];
      group.push(session);
      acc[session.status] = group;
      return acc;
    }, {} as Record<GraduationDefenseSession["status"], GraduationDefenseSession[]>);
  }, [graduationSessions]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
  };

  const filteredRegistrations = useMemo(() => {
    if (!registrations) return [];

    let sortableRegistrations = [...registrations];

    if (sortConfig !== null) {
      sortableRegistrations.sort((a, b) => {
        const aValue = a[sortConfig.key] || "";
        const bValue = b[sortConfig.key] || "";

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableRegistrations.filter((reg) => {
      const term = searchTerm.toLowerCase();
      const searchMatch =
        reg.studentName.toLowerCase().includes(term) ||
        reg.studentId.toLowerCase().includes(term) ||
        (reg.projectTitle && reg.projectTitle.toLowerCase().includes(term));

      const proposalMatch =
        proposalStatusFilter === "all" ||
        (reg.proposalStatus || "not_submitted") === proposalStatusFilter;
      const reportMatch =
        reportStatusFilter === "all" ||
        (reg.reportStatus || "not_submitted") === reportStatusFilter;

      return searchMatch && proposalMatch && reportMatch;
    });
  }, [
    registrations,
    searchTerm,
    proposalStatusFilter,
    reportStatusFilter,
    sortConfig,
  ]);

  const {
    items: paginatedRegistrations,
    state: pagination,
    next,
    prev,
  } = usePagination(filteredRegistrations, 50);

  const handleProposalAction = async (
    registration: DefenseRegistration,
    action: "approve" | "reject"
  ) => {
    const regDocRef = doc(firestore, "defenseRegistrations", registration.id);
    const newStatus = action === "approve" ? "approved" : "rejected";

    try {
      await updateDoc(regDocRef, { proposalStatus: newStatus });
      toast({
        title: "Thành công",
        description: `Đã ${
          action === "approve" ? "duyệt" : "yêu cầu chỉnh sửa"
        } thuyết minh.`,
      });
      setIsProposalDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: `Không thể cập nhật: ${error.message}`,
      });
      const contextualError = new FirestorePermissionError({
        path: regDocRef.path,
        operation: "update",
        requestResourceData: { proposalStatus: newStatus },
      });
      errorEmitter.emit("permission-error", contextualError);
    }
  };

  const handleReportAction = async (
    registration: DefenseRegistration,
    action: "approve" | "reject"
  ) => {
    const regDocRef = doc(firestore, "defenseRegistrations", registration.id);
    const newStatus = action === "approve" ? "approved" : "rejected";

    try {
      await updateDoc(regDocRef, { reportStatus: newStatus });
      toast({
        title: "Thành công",
        description: `Đã ${
          action === "approve" ? "duyệt" : "yêu cầu chỉnh sửa"
        } báo cáo.`,
      });
      setIsReportDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: `Không thể cập nhật: ${error.message}`,
      });
      const contextualError = new FirestorePermissionError({
        path: regDocRef.path,
        operation: "update",
        requestResourceData: { reportStatus: newStatus },
      });
      errorEmitter.emit("permission-error", contextualError);
    }
  };

  const handleActionClick = (
    type: "proposal" | "report" | "progress",
    registration: DefenseRegistration
  ) => {
    setSelectedRegistration(registration);
    if (type === "proposal") setIsProposalDialogOpen(true);
    if (type === "report") setIsReportDialogOpen(true);
    if (type === "progress") setIsProgressDialogOpen(true);
  };

  const getSessionDisplayName = () => {
    if (selectedSessionId === "all") return "Tất cả các đợt";
    if (selectedSessionId === "ongoing") return "Các đợt đang thực hiện";
    return sessionMap.get(selectedSessionId) || "Chọn đợt...";
  };

  const exportToExcel = () => {
    const dataToExport = filteredRegistrations.map((reg, index) => ({
      STT: index + 1,
      MSSV: reg.studentId,
      "Họ và Tên": reg.studentName,
      "Tên đề tài": reg.projectTitle || "Chưa có",
      "Đợt báo cáo": sessionMap.get(reg.sessionId) || "N/A",
      "Trạng thái TM":
        proposalStatusLabel[reg.proposalStatus || "not_submitted"],
      "Trạng thái BC": reportStatusLabel[reg.reportStatus || "not_submitted"],
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HD_TotNghiep");

    worksheet["!cols"] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 25 },
      { wch: 40 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
    ];

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `HD_TotNghiep_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-auto flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm sinh viên, đề tài..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <Select
                value={proposalStatusFilter}
                onValueChange={setProposalStatusFilter}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Lọc TT Thuyết minh" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả TT Thuyết minh</SelectItem>
                  {Object.entries(proposalStatusLabel).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={reportStatusFilter}
                onValueChange={setReportStatusFilter}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Lọc TT Báo cáo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả TT Báo cáo</SelectItem>
                  {Object.entries(reportStatusLabel).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover
                open={isSessionPopoverOpen}
                onOpenChange={setIsSessionPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isSessionPopoverOpen}
                    className="w-full sm:w-[250px] justify-between"
                  >
                    {getSessionDisplayName()}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0">
                  <Command>
                    <CommandInput placeholder="Tìm đợt báo cáo..." />
                    <CommandEmpty>Không tìm thấy.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setSelectedSessionId("all");
                            setIsSessionPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedSessionId === "all"
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          Tất cả các đợt
                        </CommandItem>
                        <CommandItem
                          value="ongoing"
                          onSelect={() => {
                            setSelectedSessionId("ongoing");
                            setIsSessionPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedSessionId === "ongoing"
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          Các đợt đang thực hiện
                        </CommandItem>
                        {Object.entries(groupedSessions).map(
                          ([status, sessionList]) =>
                            sessionList.length > 0 && (
                              <CommandGroup
                                key={status}
                                heading={
                                  statusLabel[
                                    status as keyof typeof statusLabel
                                  ] || status
                                }
                              >
                                {sessionList.map((session) => (
                                  <CommandItem
                                    key={session.id}
                                    value={session.name}
                                    onSelect={() => {
                                      setSelectedSessionId(session.id);
                                      setIsSessionPopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedSessionId === session.id
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {session.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button onClick={exportToExcel} variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Xuất Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        className="px-0 hover:bg-transparent"
                        onClick={() => requestSort("studentName")}
                      >
                        Sinh viên {getSortIcon("studentName")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        className="px-0 hover:bg-transparent"
                        onClick={() => requestSort("projectTitle")}
                      >
                        Đề tài {getSortIcon("projectTitle")}
                      </Button>
                    </TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.length > 0 ? (
                    paginatedRegistrations.map((reg) => (
                      <RegistrationRow
                        key={reg.id}
                        registration={reg}
                        sessionMap={sessionMap}
                        onAction={handleActionClick}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        Không có sinh viên nào.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-4">
                <PaginationControls
                  state={pagination}
                  onPrev={prev}
                  onNext={next}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isProposalDialogOpen}
        onOpenChange={setIsProposalDialogOpen}
      >
        <DialogContent className="sm:max-w-2xl">
          {selectedRegistration && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileSignature /> Thuyết minh của sinh viên
                </DialogTitle>
                <DialogDescription>
                  Xem xét và phê duyệt thuyết minh của sinh viên:{" "}
                  {selectedRegistration.studentName} (
                  {selectedRegistration.studentId})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 max-h-[60vh] overflow-y-auto p-4 border rounded-md">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">
                    {selectedRegistration.projectTitle}
                  </h3>
                </div>
                <Separator />
                <div className="space-y-1">
                  <h4 className="font-semibold flex items-center gap-2 text-base">
                    <Book className="h-4 w-4 text-primary" /> Tóm tắt
                  </h4>
                  <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedRegistration.summary || ""}
                    </ReactMarkdown>
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold flex items-center gap-2 text-base">
                    <Target className="h-4 w-4 text-primary" /> Mục tiêu
                  </h4>
                  <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedRegistration.objectives || ""}
                    </ReactMarkdown>
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold flex items-center gap-2 text-base">
                    <FileSignature className="h-4 w-4 text-primary" /> Phương
                    pháp & Công nghệ thực hiện
                  </h4>
                  <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedRegistration.implementationPlan || ""}
                    </ReactMarkdown>
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold flex items-center gap-2 text-base">
                    <CheckCircle className="h-4 w-4 text-primary" /> Kết quả
                    mong đợi
                  </h4>
                  <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedRegistration.expectedResults || ""}
                    </ReactMarkdown>
                  </div>
                </div>
                {selectedRegistration.proposalLink && (
                  <div className="space-y-1">
                    <h4 className="font-semibold flex items-center gap-2 text-base">
                      <LinkIcon className="h-4 w-4 text-primary" /> Link file
                      toàn văn
                    </h4>
                    <a
                      href={selectedRegistration.proposalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline break-all"
                    >
                      {selectedRegistration.proposalLink}
                    </a>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() =>
                    handleProposalAction(selectedRegistration, "reject")
                  }
                >
                  Yêu cầu chỉnh sửa
                </Button>
                <Button
                  onClick={() =>
                    handleProposalAction(selectedRegistration, "approve")
                  }
                >
                  Duyệt thuyết minh
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedRegistration && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileUp /> Báo cáo cuối kỳ của sinh viên
                </DialogTitle>
                <DialogDescription>
                  Xem xét và phê duyệt báo cáo cuối kỳ của sinh viên:{" "}
                  {selectedRegistration.studentName} (
                  {selectedRegistration.studentId})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 max-h-[60vh] overflow-y-auto p-4 border rounded-md">
                <p className="text-sm text-muted-foreground">
                  Thông tin dưới đây là bản tóm tắt cuối cùng sinh viên đã nộp.
                </p>
                <div className="space-y-1">
                  <h4 className="font-semibold flex items-center gap-2 text-base">
                    <LinkIcon className="h-4 w-4 text-primary" /> Link file báo
                    cáo toàn văn
                  </h4>
                  {selectedRegistration.reportLink ? (
                    <a
                      href={selectedRegistration.reportLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline break-all"
                    >
                      {selectedRegistration.reportLink}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sinh viên chưa nộp link báo cáo.
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() =>
                    handleReportAction(selectedRegistration, "reject")
                  }
                >
                  Yêu cầu chỉnh sửa
                </Button>
                <Button
                  onClick={() =>
                    handleReportAction(selectedRegistration, "approve")
                  }
                >
                  Duyệt Báo cáo
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isProgressDialogOpen}
        onOpenChange={setIsProgressDialogOpen}
      >
        <DialogContent className="sm:max-w-2xl">
          {selectedRegistration && (
            <ViewProgressDialog
              registration={selectedRegistration}
              onFinished={() => setIsProgressDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
