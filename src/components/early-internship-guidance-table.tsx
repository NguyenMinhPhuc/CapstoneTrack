"use client";

import { useState, useMemo, useEffect } from "react";
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
import {
  MoreHorizontal,
  Check,
  X,
  CheckCircle,
  Clock,
  Activity,
  Search,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
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
  updateDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import type {
  EarlyInternship,
  DefenseRegistration,
  EarlyInternshipWeeklyReport,
  SystemSettings,
} from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "./ui/dialog";
import { RejectionReasonDialog } from "./rejection-reason-dialog";
import { ViewEarlyInternshipProgressDialog } from "./view-early-internship-progress-dialog";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Progress } from "./ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserCheck as UserCheckIcon, UserX } from "lucide-react";

interface EarlyInternshipGuidanceTableProps {
  supervisorId: string;
}

const statusLabel: Record<EarlyInternship["status"], string> = {
  pending_admin_approval: "Chờ Admin duyệt",
  pending_company_approval: "Chờ duyệt",
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
  | "batch"
  | "startDate"
  | "progress";
type SortDirection = "asc" | "desc";

export function EarlyInternshipGuidanceTable({
  supervisorId,
}: EarlyInternshipGuidanceTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [selectedInternship, setSelectedInternship] =
    useState<EarlyInternship | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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

  const internshipsQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, "earlyInternships"),
        where("supervisorId", "==", supervisorId),
        where("status", "in", [
          "pending_company_approval",
          "ongoing",
          "completed",
          "rejected_by_company",
          "cancelled",
        ])
      ),
    [firestore, supervisorId]
  );

  const {
    data: internships,
    isLoading: isLoadingInternships,
    forceRefresh,
  } = useCollection<EarlyInternship>(internshipsQuery);

  const internshipIds = useMemo(
    () => internships?.map((i) => i.id) || [],
    [internships]
  );

  // Chunked subscription to avoid Firestore 'in' limit (max 10 items)
  const useChunkedWeeklyReports = (internshipIds: string[]) => {
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
  };

  const { reports: allReports, loading: isLoadingReports } =
    useChunkedWeeklyReports(internshipIds);

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

  const uniqueBatches = useMemo(() => {
    if (!internships) return [];
    const batches = new Set<string>();
    internships.forEach((internship) => {
      if (internship.batch) batches.add(internship.batch);
    });
    return Array.from(batches).sort((a, b) => {
      const [aMonth, aYear] = a.split("/");
      const [bMonth, bYear] = b.split("/");
      if (aYear !== bYear) return bYear.localeCompare(aYear);
      return bMonth.localeCompare(aMonth);
    });
  }, [internships]);

  const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp && typeof timestamp.toDate === "function") {
      return timestamp.toDate();
    }
    return timestamp;
  };

  const sortedAndFilteredInternships = useMemo(() => {
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

        // Handle numeric and string sorting for other keys
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
        (internship.studentIdentifier || "").toLowerCase().includes(term);

      const batchMatch =
        batchFilter === "all" || internship.batch === batchFilter;
      const statusMatch =
        statusFilter === "all" || internship.status === statusFilter;

      return searchMatch && batchMatch && statusMatch;
    });
  }, [
    internships,
    searchTerm,
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

  const handleStatusChange = async (
    internship: EarlyInternship,
    status: "ongoing" | "rejected_by_company" | "cancelled" | "completed",
    note?: string
  ) => {
    const docRef = doc(firestore, "earlyInternships", internship.id);
    const dataToUpdate: Partial<EarlyInternship> = {
      status,
      statusNote: note || "",
    };

    const batch = writeBatch(firestore);
    batch.update(docRef, dataToUpdate);

    if (status === "completed") {
      try {
        const sessionsQuery = query(
          collection(firestore, "graduationDefenseSessions"),
          where("status", "==", "ongoing")
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);
        if (sessionsSnapshot.empty) {
          toast({
            variant: "destructive",
            title: "Không tìm thấy đợt báo cáo",
            description:
              "Không có đợt báo cáo nào đang diễn ra để thêm sinh viên vào.",
          });
          return;
        }
        const ongoingSession = sessionsSnapshot.docs[0];
        const ongoingSessionId = ongoingSession.id;

        const registrationQuery = query(
          collection(firestore, "defenseRegistrations"),
          where("sessionId", "==", ongoingSessionId),
          where("studentDocId", "==", internship.studentId)
        );
        const registrationSnapshot = await getDocs(registrationQuery);

        const registrationData: Partial<DefenseRegistration> = {
          internshipStatus: "reporting",
          internship_companyName: internship.companyName,
          internship_companyAddress: internship.companyAddress || "",
          internship_companySupervisorName: internship.supervisorName,
          internshipSupervisorId: internship.supervisorId,
          internshipSupervisorName: internship.supervisorName,
        };

        if (registrationSnapshot.empty) {
          const newRegistrationRef = doc(
            collection(firestore, "defenseRegistrations")
          );
          const newRegistrationData: Partial<DefenseRegistration> = {
            ...registrationData,
            sessionId: ongoingSessionId,
            studentDocId: internship.studentId,
            studentId: internship.studentIdentifier,
            studentName: internship.studentName,
            graduationStatus: "not_reporting",
            registrationDate: serverTimestamp(),
          };
          batch.set(newRegistrationRef, newRegistrationData);
        } else {
          const existingRegistrationRef = registrationSnapshot.docs[0].ref;
          batch.update(existingRegistrationRef, registrationData);
        }
      } catch (error) {
        console.error("Error adding student to ongoing session:", error);
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Không thể tự động thêm sinh viên vào đợt báo cáo.",
        });
        return;
      }
    }

    try {
      await batch.commit();
      toast({
        title: "Thành công",
        description: "Đã cập nhật trạng thái thực tập.",
      });
      forceRefresh();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái.",
      });
    }
  };

  const handleRejectClick = (internship: EarlyInternship) => {
    setSelectedInternship(internship);
    setIsRejectDialogOpen(true);
  };

  const handleProgressClick = (internship: EarlyInternship) => {
    setSelectedInternship(internship);
    setIsProgressDialogOpen(true);
  };

  const isLoading = isLoadingInternships || isLoadingReports;

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

  const reportsForSelected = selectedInternship
    ? allReports?.filter(
        (r) => r.earlyInternshipId === selectedInternship.id
      ) || []
    : [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Danh sách Sinh viên</CardTitle>
              <CardDescription>
                Các sinh viên đã chọn bạn làm người hướng dẫn thực tập sớm.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Tìm theo MSSV, tên..."
                  className="w-full rounded-lg bg-background pl-8 sm:w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={batchFilter} onValueChange={setBatchFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
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
              {sortedAndFilteredInternships?.map((internship, index) => {
                const progress = progressData.get(internship.id);
                const newReportsCount =
                  allReports?.filter(
                    (r) =>
                      r.earlyInternshipId === internship.id &&
                      r.status === "pending_review"
                  ).length || 0;
                return (
                  <TableRow key={internship.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {internship.studentName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {internship.studentIdentifier}
                      </div>
                    </TableCell>
                    <TableCell>{internship.companyName}</TableCell>
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
                      {internship.status === "pending_company_approval" && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleStatusChange(internship, "ongoing")
                            }
                          >
                            <Check className="mr-2 h-4 w-4" /> Duyệt
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectClick(internship)}
                          >
                            <X className="mr-2 h-4 w-4" /> Từ chối
                          </Button>
                        </div>
                      )}
                      {(internship.status === "ongoing" ||
                        internship.status === "completed" ||
                        internship.status === "rejected_by_company") && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="relative"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              {newReportsCount > 0 && (
                                <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                                </span>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleProgressClick(internship)}
                            >
                              <Activity className="mr-2 h-4 w-4" />
                              <span>
                                Xem tiến độ
                                {newReportsCount > 0 && (
                                  <Badge variant="secondary" className="ml-2">
                                    {newReportsCount} mới
                                  </Badge>
                                )}
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(
                                  internship,
                                  "completed",
                                  "Hoàn thành tốt"
                                )
                              }
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              <span>Đánh dấu Hoàn thành</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                handleStatusChange(
                                  internship,
                                  "cancelled",
                                  "Không hoàn thành"
                                )
                              }
                            >
                              <X className="mr-2 h-4 w-4" />
                              <span>Hủy Thực tập</span>
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
        </CardContent>
      </Card>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          {selectedInternship && (
            <RejectionReasonDialog
              registration={selectedInternship as any} // Cast as any because the dialog expects DefenseRegistration
              onConfirm={(reason) => {
                handleStatusChange(
                  selectedInternship,
                  "rejected_by_company",
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

      <Dialog
        open={isProgressDialogOpen}
        onOpenChange={setIsProgressDialogOpen}
      >
        <DialogContent className="sm:max-w-2xl">
          {selectedInternship && (
            <ViewEarlyInternshipProgressDialog
              internship={selectedInternship}
              reports={reportsForSelected}
              onFinished={() => {
                setIsProgressDialogOpen(false);
                setSelectedInternship(null);
              }}
              forceRefresh={forceRefresh}
              goalHours={goalHours}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
