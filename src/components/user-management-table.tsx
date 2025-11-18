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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  Upload,
  ListFilter,
  Shield,
  User,
  GraduationCap,
  KeyRound,
  ArrowUpDown,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useAuth,
  useCollection,
  useFirestore,
  useMemoFirebase,
} from "@/firebase";
import { collection, doc, updateDoc } from "firebase/firestore";
import type { SystemUser, Student, Supervisor } from "@/lib/types";

import { Skeleton } from "./ui/skeleton";
import { format } from "date-fns";
import { AddUserForm } from "./add-user-form";
import { EditUserForm } from "./edit-user-form";
import { useToast } from "@/hooks/use-toast";
import { sendPasswordResetEmail } from "firebase/auth";
import { Input } from "./ui/input";
import { ImportUsersDialog } from "./import-users-dialog";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

type RoleStats = {
  total: number;
  active: number;
  pending: number;
  disabled: number;
};

type SortKey = "displayName" | "email" | "role" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

export function UserManagementTable() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isImportUserDialogOpen, setIsImportUserDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showOnlyDuplicates, setShowOnlyDuplicates] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const usersCollectionRef = useMemoFirebase(
    () => collection(firestore, "users"),
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers } =
    useCollection<SystemUser>(usersCollectionRef);

  const studentsCollectionRef = useMemoFirebase(
    () => collection(firestore, "students"),
    [firestore]
  );
  const { data: students, isLoading: isLoadingStudents } =
    useCollection<Student>(studentsCollectionRef);

  const supervisorsCollectionRef = useMemoFirebase(
    () => collection(firestore, "supervisors"),
    [firestore]
  );
  const { data: supervisors, isLoading: isLoadingSupervisors } =
    useCollection<Supervisor>(supervisorsCollectionRef);

  const linkedUserIds = useMemo(() => {
    const ids = new Set<string>();
    if (students) {
      students.forEach((s) => ids.add(s.userId));
    }
    if (supervisors) {
      supervisors.forEach((s) => ids.add(s.userId));
    }
    return ids;
  }, [students, supervisors]);

  const roleStats = useMemo(() => {
    const stats: Record<SystemUser["role"], RoleStats> = {
      admin: { total: 0, active: 0, pending: 0, disabled: 0 },
      supervisor: { total: 0, active: 0, pending: 0, disabled: 0 },
      student: { total: 0, active: 0, pending: 0, disabled: 0 },
    };

    if (!users) return stats;

    return users.reduce((acc, user) => {
      if (acc[user.role]) {
        acc[user.role].total++;
        if (acc[user.role][user.status] !== undefined) {
          acc[user.role][user.status]++;
        }
      }
      return acc;
    }, stats);
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];

    let filtered = users;

    if (showOnlyDuplicates) {
      const emailCounts = users.reduce((acc, user) => {
        if (user.email) {
          acc.set(user.email, (acc.get(user.email) || 0) + 1);
        }
        return acc;
      }, new Map<string, number>());

      const duplicateEmails = new Set<string>();
      emailCounts.forEach((count, email) => {
        if (count > 1) {
          duplicateEmails.add(email);
        }
      });

      filtered = filtered.filter(
        (user) => user.email && duplicateEmails.has(user.email)
      );
    }

    filtered = filtered.filter((user) => {
      const searchMatch =
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email
          ? user.email.toLowerCase().includes(searchTerm.toLowerCase())
          : false);
      const roleMatch = roleFilter === "all" || user.role === roleFilter;
      const statusMatch =
        statusFilter === "all" || user.status === statusFilter;
      return searchMatch && roleMatch && statusMatch;
    });

    const sortableUsers = [...filtered];

    sortableUsers.sort((a, b) => {
      if (showOnlyDuplicates && a.email && b.email) {
        const emailCompare = a.email.localeCompare(b.email);
        if (emailCompare !== 0) {
          return emailCompare;
        }
      }

      if (sortConfig !== null) {
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

        if (sortConfig.key === "displayName") {
          const aName = a.displayName || a.email;
          const bName = b.displayName || b.email;
          if (aName < bName) return sortConfig.direction === "asc" ? -1 : 1;
          if (aName > bName) return sortConfig.direction === "asc" ? 1 : -1;
          return 0;
        }

        if (String(aValue) < String(bValue)) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (String(aValue) > String(bValue)) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
      }

      return (
        (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0) -
        (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0)
      );
    });

    return sortableUsers;
  }, [
    users,
    searchTerm,
    roleFilter,
    statusFilter,
    showOnlyDuplicates,
    sortConfig,
  ]);

  // Khi thay đổi filter/search, quay về trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter, showOnlyDuplicates]);

  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredUsers.length);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

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

  const roleVariant: Record<
    SystemUser["role"],
    "default" | "secondary" | "outline"
  > = {
    admin: "default",
    supervisor: "secondary",
    student: "outline",
  };

  const statusVariant: Record<
    SystemUser["status"],
    "default" | "secondary" | "destructive"
  > = {
    active: "default",
    pending: "secondary",
    disabled: "destructive",
  };

  const statusLabel: Record<SystemUser["status"], string> = {
    active: "Đang hoạt động",
    pending: "Đang chờ",
    disabled: "Đã bị khóa",
  };

  const statusColor: Record<SystemUser["status"], string> = {
    active: "text-green-600 dark:text-green-500",
    pending: "text-orange-600 dark:text-orange-500",
    disabled: "text-red-600 dark:text-red-500",
  };

  const handleEditClick = (user: SystemUser) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleStatusChange = async (
    userId: string,
    newStatus: SystemUser["status"]
  ) => {
    const userDocRef = doc(firestore, "users", userId);
    try {
      await updateDoc(userDocRef, { status: newStatus });
      toast({
        title: "Thành công",
        description: `Trạng thái người dùng đã được cập nhật thành "${statusLabel[newStatus]}".`,
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái người dùng.",
      });
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Thành công",
        description: `Email đặt lại mật khẩu đã được gửi tới ${email}.`,
      });
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.message || "Không thể gửi email đặt lại mật khẩu.",
      });
    }
  };

  const isLoading = isLoadingUsers || isLoadingStudents || isLoadingSupervisors;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-2/4" />
                <Skeleton className="h-6 w-6 rounded-sm" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-1/4 mb-2" />
                <Skeleton className="h-4 w-full" />
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
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleStats.admin.total}</div>
            <p className="text-xs text-muted-foreground space-x-2">
              <span className={cn("font-medium", statusColor.active)}>
                {roleStats.admin.active} active
              </span>
              <span className={cn("font-medium", statusColor.pending)}>
                {roleStats.admin.pending} pending
              </span>
              <span className={cn("font-medium", statusColor.disabled)}>
                {roleStats.admin.disabled} disabled
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supervisors</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roleStats.supervisor.total}
            </div>
            <p className="text-xs text-muted-foreground space-x-2">
              <span className={cn("font-medium", statusColor.active)}>
                {roleStats.supervisor.active} active
              </span>
              <span className={cn("font-medium", statusColor.pending)}>
                {roleStats.supervisor.pending} pending
              </span>
              <span className={cn("font-medium", statusColor.disabled)}>
                {roleStats.supervisor.disabled} disabled
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleStats.student.total}</div>
            <p className="text-xs text-muted-foreground space-x-2">
              <span className={cn("font-medium", statusColor.active)}>
                {roleStats.student.active} active
              </span>
              <span className={cn("font-medium", statusColor.pending)}>
                {roleStats.student.pending} pending
              </span>
              <span className={cn("font-medium", statusColor.disabled)}>
                {roleStats.student.disabled} disabled
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>User List</CardTitle>
              <CardDescription>Manage all users in the system.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="flex w-full sm:w-auto gap-2">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by email..."
                    className="pl-8 w-full sm:w-64"
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
                      <span className="sr-only sm:not-sr-only">Filter</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Lọc theo vai trò</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={roleFilter === "all"}
                      onCheckedChange={() => setRoleFilter("all")}
                    >
                      Tất cả vai trò
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={roleFilter === "admin"}
                      onCheckedChange={() => setRoleFilter("admin")}
                    >
                      Admin
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={roleFilter === "supervisor"}
                      onCheckedChange={() => setRoleFilter("supervisor")}
                    >
                      Supervisor
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={roleFilter === "student"}
                      onCheckedChange={() => setRoleFilter("student")}
                    >
                      Student
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Lọc theo trạng thái</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={statusFilter === "all"}
                      onCheckedChange={() => setStatusFilter("all")}
                    >
                      Tất cả trạng thái
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={statusFilter === "active"}
                      onCheckedChange={() => setStatusFilter("active")}
                    >
                      Đang hoạt động
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={statusFilter === "pending"}
                      onCheckedChange={() => setStatusFilter("pending")}
                    >
                      Đang chờ
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={statusFilter === "disabled"}
                      onCheckedChange={() => setStatusFilter("disabled")}
                    >
                      Đã bị khóa
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={showOnlyDuplicates}
                      onCheckedChange={setShowOnlyDuplicates}
                    >
                      Chỉ hiển thị email trùng lặp
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex w-full sm:w-auto gap-2">
                <Dialog
                  open={isImportUserDialogOpen}
                  onOpenChange={setIsImportUserDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Upload className="mr-2 h-4 w-4" />
                      Import
                    </Button>
                  </DialogTrigger>
                  <ImportUsersDialog
                    onFinished={() => setIsImportUserDialogOpen(false)}
                  />
                </Dialog>
                <Dialog
                  open={isAddUserDialogOpen}
                  onOpenChange={setIsAddUserDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                      <DialogDescription>
                        Enter the details below to create a new user account.
                      </DialogDescription>
                    </DialogHeader>
                    <AddUserForm
                      onFinished={() => setIsAddUserDialogOpen(false)}
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
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="px-0 hover:bg-transparent"
                    onClick={() => requestSort("displayName")}
                  >
                    User {getSortIcon("displayName")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="px-0 hover:bg-transparent"
                    onClick={() => requestSort("role")}
                  >
                    Role {getSortIcon("role")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="px-0 hover:bg-transparent"
                    onClick={() => requestSort("status")}
                  >
                    Status {getSortIcon("status")}
                  </Button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <Button
                    variant="ghost"
                    className="px-0 hover:bg-transparent"
                    onClick={() => requestSort("createdAt")}
                  >
                    Created At {getSortIcon("createdAt")}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers?.map((user, index) => {
                const isLinked = linkedUserIds.has(user.id);
                return (
                  <TableRow key={user.id}>
                    <TableCell>{startIndex + index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            <User className="h-5 w-5 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {user.displayName || "Chưa có tên"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                        {isLinked && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Tài khoản này đã được liên kết với một hồ sơ
                                  Sinh viên hoặc Giáo viên.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={roleVariant[user.role]}
                        className="capitalize"
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[user.status]}>
                        {statusLabel[user.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {user.createdAt?.toDate &&
                        format(user.createdAt.toDate(), "PPP")}
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
                            onClick={() => handleEditClick(user)}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <span>Change Status</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(user.id, "active")
                                  }
                                  disabled={user.status === "active"}
                                >
                                  Activate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(user.id, "pending")
                                  }
                                  disabled={user.status === "pending"}
                                >
                                  Set to Pending
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(user.id, "disabled")
                                  }
                                  disabled={user.status === "disabled"}
                                >
                                  Disable
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleResetPassword(user.email)}
                          >
                            <KeyRound className="mr-2 h-4 w-4" />
                            <span>Send Password Reset</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Hiển thị {filteredUsers.length === 0 ? 0 : startIndex + 1}–
              {endIndex} trong {filteredUsers.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Trước
              </Button>
              <span className="text-sm">
                Trang {safePage}/{totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={safePage >= totalPages}
              >
                Sau
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update the user's details below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <EditUserForm
              user={selectedUser}
              onFinished={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
