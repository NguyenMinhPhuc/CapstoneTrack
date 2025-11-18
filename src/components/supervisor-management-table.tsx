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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  ListFilter,
  Briefcase,
  GraduationCap,
  Users,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Upload,
  FileDown,
  KeyRound,
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, writeBatch, updateDoc } from "firebase/firestore";
import type { Supervisor, SystemUser } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { AddSupervisorForm } from "./add-supervisor-form";
import { EditSupervisorForm } from "./edit-supervisor-form";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { AssignGuidanceScopeDialog } from "./assign-guidance-scope-dialog";
import { ImportSupervisorsDialog } from "./import-supervisors-dialog";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { cn } from "@/lib/utils";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";

const statusLabel: Record<SystemUser["status"], string> = {
  active: "Hoạt động",
  pending: "Chờ",
  disabled: "Vô hiệu hóa",
};

const statusVariant: Record<
  SystemUser["status"],
  "default" | "secondary" | "destructive"
> = {
  active: "default",
  pending: "secondary",
  disabled: "destructive",
};

type SortKey = "firstName" | "email" | "department" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

export function SupervisorManagementTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignScopeDialogOpen, setIsAssignScopeDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [supervisorToDisable, setSupervisorToDisable] =
    useState<Supervisor | null>(null);
  const [selectedSupervisor, setSelectedSupervisor] =
    useState<Supervisor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [guidanceFilter, setGuidanceFilter] = useState("all");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  } | null>(null);

  const supervisorsCollectionRef = useMemoFirebase(
    () => collection(firestore, "supervisors"),
    [firestore]
  );

  const { data: supervisors, isLoading: isLoadingSupervisors } =
    useCollection<Supervisor>(supervisorsCollectionRef);

  const usersCollectionRef = useMemoFirebase(
    () => collection(firestore, "users"),
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers } =
    useCollection<SystemUser>(usersCollectionRef);

  const supervisorsWithStatus = useMemo(() => {
    if (!supervisors || !users) return [];
    const userStatusMap = new Map(
      users.map((u) => [
        u.id,
        { status: u.status, passwordInitialized: u.passwordInitialized },
      ])
    );
    return supervisors.map((s) => ({
      ...s,
      status: userStatusMap.get(s.id)?.status || "pending",
      passwordInitialized:
        userStatusMap.get(s.id)?.passwordInitialized || false,
    }));
  }, [supervisors, users]);

  const filteredSupervisors = useMemo(() => {
    if (!supervisorsWithStatus) return [];

    let sortableSupervisors = [...supervisorsWithStatus];

    if (sortConfig !== null) {
      sortableSupervisors.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? "";
        const bValue = b[sortConfig.key] ?? "";

        if (sortConfig.key === "createdAt") {
          const dateA = (aValue as any)?.toDate
            ? (aValue as any).toDate().getTime()
            : 0;
          const dateB = (bValue as any)?.toDate
            ? (bValue as any).toDate().getTime()
            : 0;
          if (dateA < dateB) return sortConfig.direction === "asc" ? -1 : 1;
          if (dateA > dateB) return sortConfig.direction === "asc" ? 1 : -1;
          return 0;
        }

        if (String(aValue) < String(bValue)) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (String(aValue) > String(bValue)) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableSupervisors.filter((supervisor) => {
      const term = searchTerm.toLowerCase();
      const nameMatch = `${supervisor.firstName} ${supervisor.lastName}`
        .toLowerCase()
        .includes(term);
      const emailMatch = supervisor.email?.toLowerCase().includes(term);
      const departmentMatch = supervisor.department
        ?.toLowerCase()
        .includes(term);

      const guidanceMatch =
        guidanceFilter === "all" ||
        (guidanceFilter === "graduation" && supervisor.canGuideGraduation) ||
        (guidanceFilter === "internship" && supervisor.canGuideInternship) ||
        (guidanceFilter === "both" &&
          supervisor.canGuideGraduation &&
          supervisor.canGuideInternship) ||
        (guidanceFilter === "none" &&
          !supervisor.canGuideGraduation &&
          !supervisor.canGuideInternship);

      return (nameMatch || emailMatch || departmentMatch) && guidanceMatch;
    });
  }, [supervisorsWithStatus, searchTerm, guidanceFilter, sortConfig]);
  const {
    items: paginatedSupervisors,
    state: pageState,
    next,
    prev,
  } = usePagination(filteredSupervisors, 50);

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

  const handleEditClick = (supervisor: Supervisor) => {
    setSelectedSupervisor(supervisor);
    setIsEditDialogOpen(true);
  };

  const handleDisableClick = (supervisor: Supervisor) => {
    setSupervisorToDisable(supervisor);
    setIsDeleteDialogOpen(true);
  };

  const confirmDisable = async () => {
    if (!supervisorToDisable) return;
    const userDocRef = doc(firestore, "users", supervisorToDisable.id);
    try {
      await updateDoc(userDocRef, { status: "disabled" });
      toast({
        title: "Thành công",
        description: `Tài khoản của giáo viên ${supervisorToDisable.firstName} ${supervisorToDisable.lastName} đã được vô hiệu hóa.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: `Không thể vô hiệu hóa tài khoản: ${error.message}`,
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSupervisorToDisable(null);
    }
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedRowIds(paginatedSupervisors?.map((s) => s.id) || []);
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRowIds((prev) => [...prev, id]);
    } else {
      setSelectedRowIds((prev) => prev.filter((rowId) => rowId !== id));
    }
  };

  const handleDialogFinished = () => {
    setIsAssignScopeDialogOpen(false);
    setSelectedRowIds([]);
  };

  const handleExportTemplate = () => {
    const headers = [
      "Email",
      "Password",
      "HoGV",
      "TenGV",
      "Khoa",
      "ChucVu",
      "HuongDanTN",
      "HuongDanTT",
    ];
    const sampleData = [
      {
        Email: "gv.a@example.com",
        Password: "123456",
        HoGV: "Nguyễn Văn",
        TenGV: "A",
        Khoa: "Công nghệ thông tin",
        ChucVu: "Giảng viên",
        HuongDanTN: "true",
        HuongDanTT: "false",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachGiaoVien");

    worksheet["!cols"] = headers.map((h) => ({
      wch: h.length > 20 ? h.length : 20,
    }));

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "Template_GiaoVien.xlsx");
  };

  const isLoading = isLoadingSupervisors || isLoadingUsers;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getGuidanceBadges = (supervisor: Supervisor) => {
    const badges = [];
    if (supervisor.canGuideGraduation) {
      badges.push(
        <Badge
          key="grad"
          variant="outline"
          className="text-primary border-primary"
        >
          TN
        </Badge>
      );
    }
    if (supervisor.canGuideInternship) {
      badges.push(
        <Badge
          key="intern"
          variant="outline"
          className="text-secondary-foreground border-secondary-foreground"
        >
          TT
        </Badge>
      );
    }
    if (badges.length === 0) {
      return <span className="text-xs text-muted-foreground">Chưa có</span>;
    }
    return <div className="flex items-center gap-1">{badges}</div>;
  };

  const isAllSelected =
    paginatedSupervisors &&
    paginatedSupervisors.length > 0 &&
    selectedRowIds.length === paginatedSupervisors.length;
  const isSomeSelected =
    selectedRowIds.length > 0 &&
    selectedRowIds.length < (paginatedSupervisors?.length ?? 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {selectedRowIds.length > 0 && (
                <Dialog
                  open={isAssignScopeDialogOpen}
                  onOpenChange={setIsAssignScopeDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Users className="mr-2 h-4 w-4" />
                      Gán phạm vi HD ({selectedRowIds.length})
                    </Button>
                  </DialogTrigger>
                  <AssignGuidanceScopeDialog
                    supervisorIds={selectedRowIds}
                    allSupervisors={supervisorsWithStatus}
                    onFinished={handleDialogFinished}
                  />
                </Dialog>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="flex w-full sm:w-auto gap-2">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Tìm kiếm theo tên, email, khoa..."
                    className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1 text-sm"
                    >
                      <ListFilter className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only">Lọc</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Phạm vi hướng dẫn</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={guidanceFilter === "all"}
                      onCheckedChange={() => setGuidanceFilter("all")}
                    >
                      Tất cả
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={guidanceFilter === "graduation"}
                      onCheckedChange={() => setGuidanceFilter("graduation")}
                    >
                      Tốt nghiệp
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={guidanceFilter === "internship"}
                      onCheckedChange={() => setGuidanceFilter("internship")}
                    >
                      Thực tập
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={guidanceFilter === "both"}
                      onCheckedChange={() => setGuidanceFilter("both")}
                    >
                      Cả hai
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={guidanceFilter === "none"}
                      onCheckedChange={() => setGuidanceFilter("none")}
                    >
                      Không hướng dẫn
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={handleExportTemplate}
                  variant="outline"
                  className="w-full"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Xuất mẫu
                </Button>
                <Dialog
                  open={isImportDialogOpen}
                  onOpenChange={setIsImportDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Upload className="mr-2 h-4 w-4" />
                      Nhập từ Excel
                    </Button>
                  </DialogTrigger>
                  <ImportSupervisorsDialog
                    onFinished={() => setIsImportDialogOpen(false)}
                  />
                </Dialog>
                <Dialog
                  open={isAddDialogOpen}
                  onOpenChange={setIsAddDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Thêm Giáo viên
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Thêm Giáo viên Hướng dẫn mới</DialogTitle>
                      <DialogDescription>
                        Điền thông tin chi tiết để tạo một hồ sơ giáo viên mới.
                        Một email đặt lại mật khẩu sẽ được gửi đến họ.
                      </DialogDescription>
                    </DialogHeader>
                    <AddSupervisorForm
                      onFinished={() => setIsAddDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
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
                <TableHead className="w-[50px]">STT</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => requestSort("firstName")}
                    className="px-0 hover:bg-transparent"
                  >
                    Họ và Tên {getSortIcon("firstName")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => requestSort("email")}
                    className="px-0 hover:bg-transparent"
                  >
                    Email {getSortIcon("email")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => requestSort("department")}
                    className="px-0 hover:bg-transparent"
                  >
                    Khoa {getSortIcon("department")}
                  </Button>
                </TableHead>
                <TableHead>Phạm vi HD</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => requestSort("status")}
                    className="px-0 hover:bg-transparent"
                  >
                    Trạng thái {getSortIcon("status")}
                  </Button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort("createdAt")}
                    className="px-0 hover:bg-transparent"
                  >
                    Ngày tạo {getSortIcon("createdAt")}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSupervisors?.map((supervisor, index) => (
                <TableRow
                  key={supervisor.id}
                  data-state={
                    selectedRowIds.includes(supervisor.id) && "selected"
                  }
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedRowIds.includes(supervisor.id)}
                      onCheckedChange={(checked) =>
                        handleRowSelect(supervisor.id, !!checked)
                      }
                    />
                  </TableCell>
                  <TableCell>{pageState.startIndex + index + 1}</TableCell>
                  <TableCell className="font-medium">{`${supervisor.firstName} ${supervisor.lastName}`}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <KeyRound
                              className={cn(
                                "h-4 w-4",
                                supervisor.passwordInitialized
                                  ? "text-green-500"
                                  : "text-yellow-500"
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            {supervisor.passwordInitialized
                              ? "Đã đổi mật khẩu"
                              : "Chưa đổi mật khẩu mặc định"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {supervisor.email}
                    </div>
                  </TableCell>
                  <TableCell>{supervisor.department}</TableCell>
                  <TableCell>{getGuidanceBadges(supervisor)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[supervisor.status]}>
                      {statusLabel[supervisor.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {supervisor.createdAt?.toDate &&
                      format(supervisor.createdAt.toDate(), "PPP")}
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
                          onClick={() => handleEditClick(supervisor)}
                        >
                          Sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDisableClick(supervisor)}
                        >
                          Vô hiệu hóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls state={pageState} onPrev={prev} onNext={next} />
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin Giáo viên</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin chi tiết cho giáo viên.
            </DialogDescription>
          </DialogHeader>
          {selectedSupervisor && (
            <EditSupervisorForm
              supervisor={selectedSupervisor}
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
            <AlertDialogTitle>Vô hiệu hóa tài khoản?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ ngăn giáo viên đăng nhập vào hệ thống, nhưng tất
              cả dữ liệu lịch sử của họ sẽ được giữ lại. Bạn có chắc chắn muốn
              tiếp tục?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisable}
              className="bg-destructive hover:bg-destructive/90"
            >
              Xác nhận Vô hiệu hóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
