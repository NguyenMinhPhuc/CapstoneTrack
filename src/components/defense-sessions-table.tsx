"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  ListFilter,
  CalendarClock,
  CalendarCheck,
  CalendarX,
  Package,
  ArrowUpDown,
  Copy,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  errorEmitter,
  FirestorePermissionError,
} from "@/firebase";
import { collection, doc, updateDoc, deleteDoc } from "firebase/firestore";
import type { DefenseSession } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { format } from "date-fns";
import { AddDefenseSessionForm } from "./add-defense-session-form";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { EditDefenseSessionForm } from "./edit-defense-session-form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";

type SessionStatus = "upcoming" | "ongoing" | "completed";
type SessionStatusLabel = "Sắp diễn ra" | "Đang thực hiện" | "Hoàn thành";
type SessionType = "graduation" | "internship" | "combined";

type SortKey =
  | "name"
  | "startDate"
  | "registrationDeadline"
  | "expectedReportDate"
  | "status";
type SortDirection = "asc" | "desc";

const statusLabel: Record<SessionStatus, SessionStatusLabel> = {
  upcoming: "Sắp diễn ra",
  ongoing: "Đang thực hiện",
  completed: "Hoàn thành",
};

const statusVariant: Record<
  SessionStatus,
  "secondary" | "default" | "outline"
> = {
  upcoming: "secondary",
  ongoing: "default",
  completed: "outline",
};

const sessionTypeInfo: Record<
  SessionType,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  graduation: { label: "Tốt nghiệp", variant: "default" },
  internship: { label: "Thực tập", variant: "secondary" },
  combined: { label: "Kết hợp", variant: "outline" },
};

const getAcademicYear = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = January, 7 = August

  if (month >= 7) {
    // August or later
    return `${year} - ${year + 1}`;
  } else {
    // July or earlier
    return `${year - 1} - ${year}`;
  }
};

export function DefenseSessionsTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<DefenseSession | null>(
    null
  );
  const [sessionToCopy, setSessionToCopy] = useState<DefenseSession | null>(
    null
  );
  const [sessionToDelete, setSessionToDelete] = useState<DefenseSession | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sessionTypeFilter, setSessionTypeFilter] = useState("all");
  const [academicYearFilter, setAcademicYearFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  } | null>({ key: "startDate", direction: "desc" });

  const sessionsCollectionRef = useMemoFirebase(
    () => collection(firestore, "graduationDefenseSessions"),
    [firestore]
  );

  const { data: sessions, isLoading } = useCollection<DefenseSession>(
    sessionsCollectionRef
  );

  const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp && typeof timestamp.toDate === "function") {
      return timestamp.toDate();
    }
    return timestamp;
  };

  const academicYears = useMemo(() => {
    if (!sessions) return [];
    const years = new Set<string>();
    sessions.forEach((session) => {
      const date = toDate(session.startDate);
      if (date) {
        years.add(getAcademicYear(date));
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [sessions]);

  const sessionStats = useMemo(() => {
    const stats = {
      total: 0,
      upcoming: 0,
      ongoing: 0,
      completed: 0,
    };
    if (!sessions) return stats;

    return sessions.reduce((acc, session) => {
      acc.total++;
      if (acc[session.status] !== undefined) {
        acc[session.status]++;
      }
      return acc;
    }, stats);
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    let sortableSessions = [...sessions];

    // Sorting logic
    if (sortConfig !== null) {
      sortableSessions.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (
          sortConfig.key === "startDate" ||
          sortConfig.key === "registrationDeadline" ||
          sortConfig.key === "expectedReportDate"
        ) {
          aValue = toDate(a[sortConfig.key])?.getTime() || 0;
          bValue = toDate(b[sortConfig.key])?.getTime() || 0;
        } else {
          aValue = a[sortConfig.key] ?? "";
          bValue = b[sortConfig.key] ?? "";
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableSessions.filter((session) => {
      const searchMatch = session.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const statusMatch =
        statusFilter === "all" || session.status === statusFilter;

      const sessionDate = toDate(session.startDate);
      const academicYearMatch =
        academicYearFilter === "all" ||
        (sessionDate
          ? getAcademicYear(sessionDate) === academicYearFilter
          : false);

      const sessionTypeMatch =
        sessionTypeFilter === "all" ||
        session.sessionType === sessionTypeFilter;

      return (
        searchMatch && statusMatch && academicYearMatch && sessionTypeMatch
      );
    });
  }, [
    sessions,
    searchTerm,
    statusFilter,
    academicYearFilter,
    sortConfig,
    sessionTypeFilter,
  ]);
  const {
    items: paginatedSessions,
    state: pageState,
    next,
    prev,
  } = usePagination(filteredSessions, 50);

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
      <ArrowUpDown className="ml-2 h-4 w-4" />
    ) : (
      <ArrowUpDown className="ml-2 h-4 w-4" />
    );
  };

  const handleEditClick = (session: DefenseSession) => {
    setSelectedSession(session);
    setIsEditDialogOpen(true);
  };

  const handleCopyClick = (session: DefenseSession) => {
    setSessionToCopy(session);
    setIsAddDialogOpen(true);
  };

  const handleDeleteClick = (session: DefenseSession) => {
    setSessionToDelete(session);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    const sessionDocRef = doc(
      firestore,
      "graduationDefenseSessions",
      sessionToDelete.id
    );

    deleteDoc(sessionDocRef)
      .then(() => {
        toast({
          title: "Thành công",
          description: `Đợt báo cáo "${sessionToDelete.name}" đã được xóa.`,
        });
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: sessionDocRef.path,
          operation: "delete",
        });
        errorEmitter.emit("permission-error", contextualError);
      })
      .finally(() => {
        setIsDeleteDialogOpen(false);
        setSessionToDelete(null);
      });
  };

  const handleStatusChange = async (
    sessionId: string,
    newStatus: SessionStatus
  ) => {
    const sessionDocRef = doc(
      firestore,
      "graduationDefenseSessions",
      sessionId
    );
    const updateData = { status: newStatus };

    updateDoc(sessionDocRef, updateData)
      .then(() => {
        toast({
          title: "Thành công",
          description: `Trạng thái đợt báo cáo đã được cập nhật.`,
        });
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: sessionDocRef.path,
          operation: "update",
          requestResourceData: updateData,
        });
        errorEmitter.emit("permission-error", contextualError);
      });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-2/4" />
                <Skeleton className="h-6 w-6 rounded-sm" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-1/4 mb-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-4 w-2/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số đợt</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sắp diễn ra</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionStats.upcoming}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Đang thực hiện
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionStats.ongoing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoàn thành</CardTitle>
            <CalendarX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionStats.completed}</div>
          </CardContent>
        </Card>
      </div>
      <Tabs defaultValue="all" onValueChange={setSessionTypeFilter}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="graduation">
              <GraduationCap className="mr-2 h-4 w-4" />
              Tốt nghiệp
            </TabsTrigger>
            <TabsTrigger value="internship">
              <Briefcase className="mr-2 h-4 w-4" />
              Thực tập
            </TabsTrigger>
            <TabsTrigger value="combined">Kết hợp</TabsTrigger>
          </TabsList>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="flex w-full sm:w-auto gap-2">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Tìm kiếm theo tên..."
                  className="pl-8 w-full sm:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select
                value={academicYearFilter}
                onValueChange={setAcademicYearFilter}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Lọc theo năm học" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả năm học</SelectItem>
                  {academicYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      Năm học {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1 text-sm w-full sm:w-auto"
                  >
                    <ListFilter className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only">Lọc</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === "all"}
                    onCheckedChange={() => setStatusFilter("all")}
                  >
                    Tất cả trạng thái
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === "upcoming"}
                    onCheckedChange={() => setStatusFilter("upcoming")}
                  >
                    {statusLabel.upcoming}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === "ongoing"}
                    onCheckedChange={() => setStatusFilter("ongoing")}
                  >
                    {statusLabel.ongoing}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === "completed"}
                    onCheckedChange={() => setStatusFilter("completed")}
                  >
                    {statusLabel.completed}
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Dialog
              open={isAddDialogOpen}
              onOpenChange={(isOpen) => {
                setIsAddDialogOpen(isOpen);
                if (!isOpen) {
                  setSessionToCopy(null); // Clear copy data when dialog closes
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Tạo Đợt mới
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <AddDefenseSessionForm
                  onFinished={() => {
                    setIsAddDialogOpen(false);
                    setSessionToCopy(null);
                  }}
                  sessionToCopy={sessionToCopy}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <Card className="mt-4">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">STT</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => requestSort("name")}
                      className="px-0 hover:bg-transparent"
                    >
                      Tên đợt {getSortIcon("name")}
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
                      onClick={() => requestSort("registrationDeadline")}
                      className="px-0 hover:bg-transparent"
                    >
                      Hạn đăng ký {getSortIcon("registrationDeadline")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => requestSort("expectedReportDate")}
                      className="px-0 hover:bg-transparent"
                    >
                      Ngày báo cáo {getSortIcon("expectedReportDate")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => requestSort("status")}
                      className="px-0 hover:bg-transparent"
                    >
                      Trạng thái {getSortIcon("status")}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSessions?.map((session, index) => {
                  const typeInfo =
                    sessionTypeInfo[session.sessionType] ||
                    sessionTypeInfo.combined;
                  return (
                    <TableRow key={session.id}>
                      <TableCell>{pageState.startIndex + index + 1}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <Link
                            href={`/admin/defense-sessions/${session.id}`}
                            className="hover:underline"
                          >
                            {session.name}
                          </Link>
                          <Badge
                            variant={typeInfo.variant}
                            className="w-fit mt-1"
                          >
                            {typeInfo.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {toDate(session.startDate)
                          ? format(toDate(session.startDate)!, "dd/MM/yyyy")
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {toDate(session.registrationDeadline)
                          ? format(
                              toDate(session.registrationDeadline)!,
                              "dd/MM/yyyy"
                            )
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {toDate(session.expectedReportDate)
                          ? format(
                              toDate(session.expectedReportDate)!,
                              "dd/MM/yyyy"
                            )
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {session.status && (
                          <Badge variant={statusVariant[session.status]}>
                            {statusLabel[session.status]}
                          </Badge>
                        )}
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
                              onClick={() => handleEditClick(session)}
                            >
                              Sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCopyClick(session)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Sao chép
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <span>Thay đổi trạng thái</span>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusChange(session.id, "upcoming")
                                    }
                                    disabled={session.status === "upcoming"}
                                  >
                                    {statusLabel.upcoming}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusChange(session.id, "ongoing")
                                    }
                                    disabled={session.status === "ongoing"}
                                  >
                                    {statusLabel.ongoing}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusChange(
                                        session.id,
                                        "completed"
                                      )
                                    }
                                    disabled={session.status === "completed"}
                                  >
                                    {statusLabel.completed}
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteClick(session)}
                            >
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <PaginationControls state={pageState} onPrev={prev} onNext={next} />
          </CardContent>
        </Card>
      </Tabs>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedSession && (
            <EditDefenseSessionForm
              session={selectedSession}
              onFinished={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh
              viễn đợt báo cáo và tất cả dữ liệu liên quan khỏi máy chủ của
              chúng tôi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Tiếp tục
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
