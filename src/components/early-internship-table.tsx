"use client";

import { useState, useMemo, useEffect } from "react";
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
  MoreHorizontal,
  PlusCircle,
  Trash2,
  CheckCircle,
  Clock,
  X,
  ChevronDown,
  Search,
  ArrowUpDown,
  ChevronUp,
  FilePlus2,
  FileDown,
  Check,
} from "lucide-react";
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  errorEmitter,
  FirestorePermissionError,
  useDoc,
} from "@/firebase";
import {
  collection,
  query,
  where,
  doc,
  deleteDoc,
  writeBatch,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import type {
  EarlyInternship,
  Student,
  EarlyInternshipWeeklyReport,
  SystemSettings,
} from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { RejectionReasonDialog } from "./rejection-reason-dialog";
import { AddStudentsToSessionDialog } from "./add-students-to-session-dialog";
import { Progress } from "./ui/progress";
import { UserCheck as UserCheckIcon, UserX } from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";

// Chunked subscription to avoid Firestore 'in' limit (max 10 items)
function useChunkedWeeklyReports(
  firestore: ReturnType<typeof useFirestore>,
  internshipIds: string[]
) {
  const [reports, setReports] = useState<EarlyInternshipWeeklyReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ids = internshipIds || [];
    let unsubscribes: Array<() => void> = [];
    setReports([]);
    if (ids.length === 0) {
      setLoading(false);
      return () => {};
    }
    setLoading(true);

    const chunkSize = 10;
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
      chunks.push(ids.slice(i, i + chunkSize));
    }

    const resultsMap = new Map<string, EarlyInternshipWeeklyReport>();
    let pending = chunks.length;

    unsubscribes = chunks.map((chunk) => {
      const q = query(
        collection(firestore, "earlyInternshipWeeklyReports"),
        where("earlyInternshipId", "in", chunk)
      );
      return onSnapshot(
        q,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const data = {
              id: change.doc.id,
              ...(change.doc.data() as any),
            } as EarlyInternshipWeeklyReport;
            if (change.type === "removed") {
              resultsMap.delete(change.doc.id);
            } else {
              resultsMap.set(change.doc.id, data);
            }
          });
          setReports(Array.from(resultsMap.values()));
          pending -= 1;
          if (pending <= 0) setLoading(false);
        },
        () => {
          pending -= 1;
          if (pending <= 0) setLoading(false);
        }
      );
    });

    return () => {
      unsubscribes.forEach((u) => u && u());
    };
  }, [firestore, internshipIds.join(",")]);

  return { reports, loading } as const;
}

interface EarlyInternshipGuidanceTableProps {
  supervisorId: string;
}

const statusLabel: Record<EarlyInternship["status"], string> = {
  pending_admin_approval: "Chờ Admin duyệt",
  pending_company_approval: "Chờ ĐV duyệt",
  ongoing: "Đang thực tập",
  completed: "Hoàn thành",
  rejected_by_admin: "Admin từ chối",
  rejected_by_company: "ĐV từ chối",
  cancelled: "Đã hủy",
};

const dropdownStatusLabel: Record<EarlyInternship["status"], string> = {
  pending_admin_approval: "Chờ Admin duyệt",
  pending_company_approval: "Chuyển đơn vị",
  ongoing: "Đang thực tập",
  completed: "Hoàn thành",
  rejected_by_admin: "Admin từ chối",
  rejected_by_company: "ĐV từ chối",
  cancelled: "Đã hủy",
};

const statusVariant: Record<
  EarlyInternship["status"],
  "secondary" | "default" | "outline" | "destructive"
> = {
  pending_admin_approval: "secondary",
  pending_company_approval: "secondary",
  ongoing: "default",
  completed: "outline",
  rejected_by_admin: "destructive",
  rejected_by_company: "destructive",
  cancelled: "destructive",
};

type SortKey =
  | "studentName"
  | "companyName"
  | "supervisorName"
  | "startDate"
  | "batch"
  | "progress";
type SortDirection = "asc" | "desc";

export function EarlyInternshipTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [internshipToDelete, setInternshipToDelete] =
    useState<EarlyInternship | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isAddToSessionDialogOpen, setIsAddToSessionDialogOpen] =
    useState(false);
  const [selectedInternship, setSelectedInternship] =
    useState<EarlyInternship | null>(null);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [supervisorFilter, setSupervisorFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  } | null>(null);

  const settingsDocRef = useMemoFirebase(
    () => doc(firestore, "systemSettings", "features"),
    [firestore]
  );
  const { data: settings } = useDoc<SystemSettings>(settingsDocRef);
  const goalHours = settings?.earlyInternshipGoalHours ?? 700;

  const earlyInternshipsCollectionRef = useMemoFirebase(
    () => collection(firestore, "earlyInternships"),
    [firestore]
  );
  const { data: internships, isLoading: isLoadingInternships } =
    useCollection<EarlyInternship>(earlyInternshipsCollectionRef);

  const studentsCollectionRef = useMemoFirebase(
    () => collection(firestore, "students"),
    [firestore]
  );
  const { data: allStudents, isLoading: isLoadingStudents } =
    useCollection<Student>(studentsCollectionRef);

  const internshipIds = useMemo(
    () => internships?.map((i) => i.id) || [],
    [internships]
  );

  const { reports: allReports, loading: isLoadingReports } =
    useChunkedWeeklyReports(firestore, internshipIds);

  const isLoading =
    isLoadingInternships || isLoadingStudents || isLoadingReports;

  const progressData = useMemo(() => {
    const data = new Map<string, { totalHours: number; percentage: number }>();
    if (!allReports || !internships) return data;

    internships.forEach((internship) => {
      const reportsForInternship = allReports.filter(
        (r) => r.earlyInternshipId === internship.id && r.status === "approved"
      );
      const totalHours = reportsForInternship.reduce(
        (sum, report) => sum + report.hours,
        0
      );
      data.set(internship.id, {
        totalHours,
        percentage: (totalHours / goalHours) * 100,
      });
    });
    return data;
  }, [allReports, internships, goalHours]);

  useEffect(() => {
    setSelectedRowIds([]);
  }, [internships]);

  const { uniqueCompanies, uniqueSupervisors, uniqueBatches } = useMemo(() => {
    if (!internships)
      return { uniqueCompanies: [], uniqueSupervisors: [], uniqueBatches: [] };
    const companies = new Set<string>();
    const supervisors = new Set<string>();
    const batches = new Set<string>();
    internships.forEach((internship) => {
      if (internship.companyName) companies.add(internship.companyName);
      if (internship.supervisorName) supervisors.add(internship.supervisorName);
      if (internship.batch) batches.add(internship.batch);
    });
    return {
      uniqueCompanies: Array.from(companies).sort(),
      uniqueSupervisors: Array.from(supervisors).sort(),
      uniqueBatches: Array.from(batches).sort((a, b) => {
        const [aMonth, aYear] = a.split("/");
        const [bMonth, bYear] = b.split("/");
        if (aYear !== bYear) return bYear.localeCompare(aYear);
        return bMonth.localeCompare(aMonth);
      }),
    };
  }, [internships]);

  const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp && typeof timestamp.toDate === "function") {
      return timestamp.toDate();
    }
    return timestamp;
  };

  const filteredInternships = useMemo(() => {
    if (!internships) return [];
    let sortableInternships = [...internships];

    if (sortConfig !== null) {
      sortableInternships.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === "progress") {
          aValue = progressData.get(a.id)?.totalHours ?? 0;
          bValue = progressData.get(b.id)?.totalHours ?? 0;
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (sortConfig.key === "startDate") {
          const dateA = toDate(aValue)?.getTime() || 0;
          const dateB = toDate(bValue)?.getTime() || 0;
          if (dateA < dateB) return sortConfig.direction === "asc" ? -1 : 1;
          if (dateA > dateB) return sortConfig.direction === "asc" ? 1 : -1;
          return 0;
        }

        if (sortConfig.key === "batch") {
          const [aMonth, aYear] = (aValue as string).split("/");
          const [bMonth, bYear] = (bValue as string).split("/");
          if (aYear !== bYear) {
            return sortConfig.direction === "asc"
              ? aYear.localeCompare(bYear)
              : bYear.localeCompare(aYear);
          }
          const monthComparison = parseInt(aMonth) - parseInt(bMonth);
          return sortConfig.direction === "asc"
            ? monthComparison
            : -monthComparison;
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
          if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        } else {
          if (String(aValue) < String(bValue))
            return sortConfig.direction === "asc" ? -1 : 1;
          if (String(aValue) > String(bValue))
            return sortConfig.direction === "asc" ? 1 : -1;
        }

        return 0;
      });
    }

    return sortableInternships.filter((internship) => {
      const term = searchTerm.toLowerCase();
      const searchMatch =
        (internship.studentName || "").toLowerCase().includes(term) ||
        (internship.studentIdentifier || "").toLowerCase().includes(term) ||
        (internship.companyName || "").toLowerCase().includes(term) ||
        (internship.supervisorName || "").toLowerCase().includes(term);

      const companyMatch =
        companyFilter === "all" || internship.companyName === companyFilter;
      const supervisorMatch =
        supervisorFilter === "all" ||
        internship.supervisorName === supervisorFilter;
      const batchMatch =
        batchFilter === "all" || internship.batch === batchFilter;
      const statusMatch =
        statusFilter === "all" || internship.status === statusFilter;

      return (
        searchMatch &&
        companyMatch &&
        supervisorMatch &&
        batchMatch &&
        statusMatch
      );
    });
  }, [
    internships,
    searchTerm,
    companyFilter,
    supervisorFilter,
    batchFilter,
    statusFilter,
    sortConfig,
    progressData,
  ]);

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

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    setSelectedRowIds(
      checked ? (filteredInternships || []).map((i) => i.studentId) : []
    );
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    setSelectedRowIds((prev) =>
      checked ? [...prev, id] : prev.filter((rowId) => rowId !== id)
    );
  };

  const handleDeleteClick = (internship: EarlyInternship) => {
    setInternshipToDelete(internship);
    setIsDeleteDialogOpen(true);
  };

  const handleRejectClick = (internship: EarlyInternship) => {
    setSelectedInternship(internship);
    setIsRejectDialogOpen(true);
  };

  const handleStatusChange = async (
    internshipId: string,
    status: EarlyInternship["status"],
    note?: string
  ) => {
    const docRef = doc(firestore, "earlyInternships", internshipId);
    const dataToUpdate: Partial<EarlyInternship> = {
      status,
      statusNote: note || "",
    };

    updateDoc(docRef, dataToUpdate)
      .then(() => {
        toast({
          title: "Thành công",
          description: "Đã cập nhật trạng thái thực tập.",
        });
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: docRef.path,
          operation: "update",
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit("permission-error", contextualError);
      });
  };

  const confirmDelete = async () => {
    const batch = writeBatch(firestore);
    let count = 0;

    const internshipIdsToDelete =
      selectedRowIds.length > 0
        ? internships
            ?.filter((i) => selectedRowIds.includes(i.studentId))
            .map((i) => i.id) || []
        : internshipToDelete
        ? [internshipToDelete.id]
        : [];

    if (internshipIdsToDelete.length === 0) return;

    internshipIdsToDelete.forEach((id) => {
      batch.delete(doc(firestore, "earlyInternships", id));
    });
    count = internshipIdsToDelete.length;

    try {
      await batch.commit();
      toast({
        title: "Thành công",
        description: `Đã xóa ${count} đăng ký thực tập sớm.`,
      });
    } catch (error) {
      const contextualError = new FirestorePermissionError({
        path: "batch delete on earlyInternships",
        operation: "delete",
      });
      errorEmitter.emit("permission-error", contextualError);
    } finally {
      setIsDeleteDialogOpen(false);
      setInternshipToDelete(null);
      setSelectedRowIds([]);
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredInternships.map((item, index) => {
      const progress = progressData.get(item.id);
      return {
        STT: index + 1,
        MSSV: item.studentIdentifier,
        "Họ và Tên": item.studentName,
        "Công ty": item.companyName,
        GVHD: item.supervisorName,
        "Đợt ĐK": item.batch,
        "Ngày bắt đầu": toDate(item.startDate)
          ? format(toDate(item.startDate)!, "dd/MM/yyyy")
          : "N/A",
        "Tổng giờ": progress ? progress.totalHours.toFixed(0) : "0",
        "Trạng thái": statusLabel[item.status],
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ThucTapSom");
    worksheet["!cols"] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 25 },
      { wch: 30 },
      { wch: 25 },
      { wch: 10 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
    ];
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "BaoCao_ThucTapSom.xlsx");
  };

  const {
    items: paginatedInternships,
    state: pageState,
    next,
    prev,
  } = usePagination(filteredInternships, 50);
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }
  const isAllSelected =
    paginatedInternships &&
    paginatedInternships.length > 0 &&
    selectedRowIds.length === paginatedInternships.length;
  const isSomeSelected =
    selectedRowIds.length > 0 &&
    selectedRowIds.length < (paginatedInternships?.length ?? 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Tìm kiếm..."
                  className="w-full rounded-lg bg-background pl-8 sm:w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Lọc theo trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {Object.entries(statusLabel).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={batchFilter} onValueChange={setBatchFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Lọc theo đợt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả các đợt</SelectItem>
                  {uniqueBatches.map((batch) => (
                    <SelectItem key={batch} value={batch}>
                      Đợt {batch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Lọc theo công ty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả công ty</SelectItem>
                  {uniqueCompanies.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={supervisorFilter}
                onValueChange={setSupervisorFilter}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Lọc theo GVHD" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả GVHD</SelectItem>
                  {uniqueSupervisors.map((supervisor) => (
                    <SelectItem key={supervisor} value={supervisor}>
                      {supervisor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={exportToExcel}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Xuất Excel
              </Button>
            </div>
          </div>
          {selectedRowIds.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <Dialog
                open={isAddToSessionDialogOpen}
                onOpenChange={setIsAddToSessionDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    Thêm vào đợt ({selectedRowIds.length})
                  </Button>
                </DialogTrigger>
                <AddStudentsToSessionDialog
                  studentIds={selectedRowIds}
                  allStudents={allStudents || []}
                  onFinished={() => {
                    setIsAddToSessionDialogOpen(false);
                    setSelectedRowIds([]);
                  }}
                />
              </Dialog>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa ({selectedRowIds.length})
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      isAllSelected
                        ? true
                        : isSomeSelected
                        ? "indeterminate"
                        : false
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>STT</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => requestSort("studentName")}
                    className="px-0 hover:bg-transparent"
                  >
                    Sinh viên {getSortIcon("studentName")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => requestSort("companyName")}
                    className="px-0 hover:bg-transparent"
                  >
                    Công ty {getSortIcon("companyName")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => requestSort("supervisorName")}
                    className="px-0 hover:bg-transparent"
                  >
                    GVHD {getSortIcon("supervisorName")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => requestSort("batch")}
                    className="px-0 hover:bg-transparent"
                  >
                    Đợt ĐK {getSortIcon("batch")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => requestSort("startDate")}
                    className="px-0 hover:bg-transparent"
                  >
                    Ngày bắt đầu {getSortIcon("startDate")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => requestSort("progress")}
                    className="px-0 hover:bg-transparent"
                  >
                    Tiến độ (giờ) {getSortIcon("progress")}
                  </Button>
                </TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInternships?.map((internship, index) => {
                const progress = progressData.get(internship.id);
                return (
                  <TableRow
                    key={internship.id}
                    data-state={
                      selectedRowIds.includes(internship.studentId) &&
                      "selected"
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedRowIds.includes(internship.studentId)}
                        onCheckedChange={(checked) =>
                          handleRowSelect(internship.studentId, !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell>{pageState.startIndex + index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {internship.studentName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {internship.studentIdentifier}
                      </div>
                    </TableCell>
                    <TableCell>{internship.companyName}</TableCell>
                    <TableCell>{internship.supervisorName}</TableCell>
                    <TableCell>{internship.batch}</TableCell>
                    <TableCell>
                      {toDate(internship.startDate)
                        ? format(toDate(internship.startDate)!, "PPP")
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {progress ? (
                        <div className="w-24">
                          <Progress value={progress.percentage} />
                          <span className="text-xs text-muted-foreground">
                            {progress.totalHours.toFixed(0)}/{goalHours}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          N/A
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[internship.status]}>
                        {statusLabel[internship.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {internship.status === "pending_admin_approval" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleStatusChange(
                                internship.id,
                                "pending_company_approval"
                              )
                            }
                          >
                            <Check className="mr-2 h-4 w-4" /> Chuyển đơn vị
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectClick(internship)}
                          >
                            <X className="mr-2 h-4 w-4" /> Từ chối
                          </Button>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <span>Thay đổi trạng thái</span>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusChange(
                                        internship.id,
                                        "pending_company_approval"
                                      )
                                    }
                                    disabled={
                                      internship.status ===
                                      "pending_company_approval"
                                    }
                                  >
                                    <Clock className="mr-2 h-4 w-4" />
                                    <span>
                                      {
                                        dropdownStatusLabel.pending_company_approval
                                      }
                                    </span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusChange(
                                        internship.id,
                                        "ongoing"
                                      )
                                    }
                                    disabled={internship.status === "ongoing"}
                                  >
                                    <Clock className="mr-2 h-4 w-4" />
                                    <span>{dropdownStatusLabel.ongoing}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusChange(
                                        internship.id,
                                        "completed"
                                      )
                                    }
                                    disabled={internship.status === "completed"}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    <span>{dropdownStatusLabel.completed}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-500"
                                    onClick={() =>
                                      handleRejectClick(internship)
                                    }
                                    disabled={
                                      internship.status === "rejected_by_admin"
                                    }
                                  >
                                    <X className="mr-2 h-4 w-4" />
                                    <span>
                                      {dropdownStatusLabel.rejected_by_admin}
                                    </span>
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteClick(internship)}
                            >
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <PaginationControls state={pageState} onPrev={prev} onNext={next} />
        </CardContent>
      </Card>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Thao tác này sẽ xóa vĩnh viễn
              thông tin của{" "}
              {selectedRowIds.length > 0
                ? `${selectedRowIds.length} đăng ký đã chọn`
                : `đăng ký của ${internshipToDelete?.studentName}`}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setInternshipToDelete(null);
              }}
            >
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Tiếp tục
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          {selectedInternship && (
            <RejectionReasonDialog
              registration={selectedInternship}
              onConfirm={(reason) => {
                handleStatusChange(
                  selectedInternship.id,
                  "rejected_by_admin",
                  reason
                );
                setIsRejectDialogOpen(false);
                setSelectedInternship(null);
              }}
              onCancel={() => {
                setIsRejectDialogOpen(false);
                setSelectedInternship(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
