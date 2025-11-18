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
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  Upload,
  ListFilter,
  Trash2,
  Users,
  FilePlus2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Briefcase,
  GraduationCap,
  Check,
  X,
  FileDown,
  KeyRound,
  ChevronsUpDown,
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, writeBatch, updateDoc } from "firebase/firestore";
import type { Student, SystemUser } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { AddStudentForm } from "./add-student-form";
import { EditStudentForm } from "./edit-student-form";
import { ImportStudentsDialog } from "./import-students-dialog";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { Checkbox } from "./ui/checkbox";
import { AssignClassDialog } from "./assign-class-dialog";
import { AddStudentsToSessionDialog } from "./add-students-to-session-dialog";
import { StudentStatusDetailsDialog } from "./student-status-details-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssignMajorDialog } from "./assign-major-dialog";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";

const statusLabel: Record<Student["status"], string> = {
  studying: "Đang học",
  reserved: "Bảo lưu",
  dropped_out: "Đã nghỉ",
  graduated: "Đã tốt nghiệp",
};

const completionStatusLabel: Record<"achieved" | "not_achieved", string> = {
  achieved: "Đã đạt",
  not_achieved: "Chưa đạt",
};

const statusVariant: Record<
  Student["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  studying: "default",
  reserved: "secondary",
  dropped_out: "destructive",
  graduated: "outline",
};

const statusColorClass: Record<Student["status"], string> = {
  studying:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700",
  reserved:
    "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700",
  dropped_out:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700",
  graduated:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700",
};

type SortKey =
  | "firstName"
  | "studentId"
  | "className"
  | "email"
  | "status"
  | "createdAt"
  | "major";
type SortDirection = "asc" | "desc";

export function StudentManagementTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignClassDialogOpen, setIsAssignClassDialogOpen] = useState(false);
  const [isAssignMajorDialogOpen, setIsAssignMajorDialogOpen] = useState(false);
  const [isAddToSessionDialogOpen, setIsAddToSessionDialogOpen] =
    useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState<string[]>([]);
  const [courseFilter, setCourseFilter] = useState("all");
  const [graduationStatusFilter, setGraduationStatusFilter] = useState("all");
  const [internshipStatusFilter, setInternshipStatusFilter] = useState("all");
  const [majorFilter, setMajorFilter] = useState("all");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isStatusDetailOpen, setIsStatusDetailOpen] = useState(false);
  const [statusDetailData, setStatusDetailData] = useState<{
    title: string;
    students: Student[];
  }>({ title: "", students: [] });
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  } | null>(null);
  const [isClassPopoverOpen, setIsClassPopoverOpen] = useState(false);
  const [isCoursePopoverOpen, setIsCoursePopoverOpen] = useState(false);

  const studentsCollectionRef = useMemoFirebase(
    () => collection(firestore, "students"),
    [firestore]
  );

  const { data: students, isLoading } = useCollection<Student>(
    studentsCollectionRef
  );

  const uniqueMajors = useMemo(() => {
    if (!students) return [];
    const majorSet = new Set<string>();
    students.forEach((student) => {
      if (student.major) {
        majorSet.add(student.major);
      }
    });
    return Array.from(majorSet).sort();
  }, [students]);

  const uniqueCourses = useMemo(() => {
    if (!students) return [];
    const courseSet = new Set<string>();
    students.forEach((student) => {
      if (student.className && student.className.length >= 2) {
        courseSet.add(student.className.substring(0, 2));
      }
    });
    return Array.from(courseSet).sort();
  }, [students]);

  const classStatsByCourse = useMemo(() => {
    if (!students || !isStatsOpen) return [];

    const statsByClass: Record<
      string,
      {
        total: number;
        studying: number;
        reserved: number;
        dropped_out: number;
        graduated: number;
        gradAchieved: number;
        gradNotAchieved: number;
        internAchieved: number;
        internNotAchieved: number;
      }
    > = {};

    students.forEach((student) => {
      const className = student.className || "Chưa xếp lớp";
      if (courseFilter !== "all" && !className.startsWith(courseFilter)) {
        return;
      }

      if (!statsByClass[className]) {
        statsByClass[className] = {
          total: 0,
          studying: 0,
          reserved: 0,
          dropped_out: 0,
          graduated: 0,
          gradAchieved: 0,
          gradNotAchieved: 0,
          internAchieved: 0,
          internNotAchieved: 0,
        };
      }
      statsByClass[className].total++;
      if (statsByClass[className][student.status] !== undefined) {
        statsByClass[className][student.status]++;
      }

      if (student.graduationStatus === "achieved") {
        statsByClass[className].gradAchieved++;
      } else {
        statsByClass[className].gradNotAchieved++;
      }

      if (student.internshipStatus === "achieved") {
        statsByClass[className].internAchieved++;
      } else {
        statsByClass[className].internNotAchieved++;
      }
    });

    const groupedByCourse: Record<string, any[]> = {};
    Object.entries(statsByClass).forEach(([className, stats]) => {
      const course = className.substring(0, 2);
      if (!groupedByCourse[course]) {
        groupedByCourse[course] = [];
      }
      groupedByCourse[course].push({ className, ...stats });
    });

    return Object.entries(groupedByCourse)
      .map(([course, classes]) => ({
        course,
        classes: classes.sort((a, b) => a.className.localeCompare(b.className)),
      }))
      .sort((a, b) => a.course.localeCompare(b.course));
  }, [students, courseFilter, isStatsOpen]);

  const uniqueClasses = useMemo(() => {
    if (!students) return [];
    const classSet = new Set<string>();
    students.forEach((student) => {
      if (student.className) {
        classSet.add(student.className);
      }
    });
    return Array.from(classSet).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    let sortableStudents = [...students];

    if (sortConfig !== null) {
      sortableStudents.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? "";
        const bValue = b[sortConfig.key] ?? "";
        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableStudents.filter((student) => {
      const term = searchTerm.toLowerCase();
      const nameMatch = `${student.firstName} ${student.lastName}`
        .toLowerCase()
        .includes(term);
      const idMatch = student.studentId?.toLowerCase().includes(term);
      const emailMatch = student.email?.toLowerCase().includes(term);
      const classMatchFilter = student.className?.toLowerCase().includes(term);

      const classFilterMatch =
        classFilter.length === 0 ||
        (student.className && classFilter.includes(student.className));
      const courseMatch =
        courseFilter === "all" ||
        (student.className && student.className.startsWith(courseFilter));
      const gradStatusMatch =
        graduationStatusFilter === "all" ||
        (student.graduationStatus || "not_achieved") === graduationStatusFilter;
      const internStatusMatch =
        internshipStatusFilter === "all" ||
        (student.internshipStatus || "not_achieved") === internshipStatusFilter;
      const majorMatch = majorFilter === "all" || student.major === majorFilter;

      return (
        (nameMatch || idMatch || emailMatch || classMatchFilter) &&
        classFilterMatch &&
        courseMatch &&
        gradStatusMatch &&
        internStatusMatch &&
        majorMatch
      );
    });
  }, [
    students,
    searchTerm,
    classFilter,
    courseFilter,
    graduationStatusFilter,
    internshipStatusFilter,
    sortConfig,
    majorFilter,
  ]);
  const {
    items: paginatedStudents,
    state: pageState,
    next,
    prev,
  } = usePagination(filteredStudents, 50);

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

  const handleStatusClick = (className: string, status: Student["status"]) => {
    if (!students) return;

    const filtered = students.filter((student) => {
      const studentClassName = student.className || "Chưa xếp lớp";
      return studentClassName === className && student.status === status;
    });

    setStatusDetailData({
      title: `Danh sách sinh viên ${statusLabel[status]} - Lớp ${className}`,
      students: filtered,
    });
    setIsStatusDetailOpen(true);
  };

  const handleEditClick = (student: Student) => {
    setSelectedStudent(student);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteDialogOpen(true);
  };

  const handleBatchStatusChange = async (newStatus: Student["status"]) => {
    if (selectedRowIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Chưa chọn sinh viên",
        description: "Vui lòng chọn ít nhất một sinh viên để cập nhật.",
      });
      return;
    }
    const batch = writeBatch(firestore);
    selectedRowIds.forEach((id) => {
      const studentDocRef = doc(firestore, "students", id);
      batch.update(studentDocRef, { status: newStatus });
    });
    try {
      await batch.commit();
      toast({
        title: "Thành công",
        description: `Đã cập nhật trạng thái cho ${selectedRowIds.length} sinh viên.`,
      });
      setSelectedRowIds([]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái sinh viên.",
      });
    }
  };

  const handleCompletionStatusChange = async (
    studentId: string,
    field: "graduationStatus" | "internshipStatus",
    newStatus: "achieved" | "not_achieved"
  ) => {
    const studentDocRef = doc(firestore, "students", studentId);
    try {
      await updateDoc(studentDocRef, { [field]: newStatus });
      toast({
        title: "Thành công",
        description: `Trạng thái hoàn thành của sinh viên đã được cập nhật.`,
      });
    } catch (error) {
      console.error("Error updating student completion status:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái hoàn thành.",
      });
    }
  };

  const handleStatusChange = async (
    studentId: string,
    newStatus: Student["status"]
  ) => {
    const studentDocRef = doc(firestore, "students", studentId);
    try {
      await updateDoc(studentDocRef, { status: newStatus });
      toast({
        title: "Thành công",
        description: `Trạng thái sinh viên đã được cập nhật.`,
      });
    } catch (error) {
      console.error("Error updating student status:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái sinh viên.",
      });
    }
  };

  const confirmDelete = async () => {
    if (selectedRowIds.length > 0) {
      // Batch delete
      const batch = writeBatch(firestore);
      selectedRowIds.forEach((id) => {
        batch.delete(doc(firestore, "students", id));
        batch.delete(doc(firestore, "users", id)); // Also delete from users collection
      });
      try {
        await batch.commit();
        toast({
          title: "Thành công",
          description: `${selectedRowIds.length} sinh viên đã được xóa.`,
        });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: `Không thể xóa sinh viên: ${"error.message"}`,
        });
      } finally {
        setSelectedRowIds([]);
        setIsDeleteDialogOpen(false);
      }
    } else if (studentToDelete) {
      // Single delete
      try {
        const batch = writeBatch(firestore);
        batch.delete(doc(firestore, "students", studentToDelete.id));
        batch.delete(doc(firestore, "users", studentToDelete.id)); // Also delete from users collection
        await batch.commit();
        toast({
          title: "Thành công",
          description: `Hồ sơ sinh viên ${studentToDelete.firstName} ${studentToDelete.lastName} đã được xóa.`,
        });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: `Không thể xóa hồ sơ sinh viên: ${"error.message"}`,
        });
      } finally {
        setIsDeleteDialogOpen(false);
        setStudentToDelete(null);
      }
    }
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedRowIds(paginatedStudents?.map((s) => s.id) || []);
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
    setIsAssignClassDialogOpen(false);
    setIsAssignMajorDialogOpen(false);
    setIsAddToSessionDialogOpen(false);
    setSelectedRowIds([]);
  };

  const exportToExcel = () => {
    const dataToExport = filteredStudents.map((student, index) => ({
      STT: index + 1,
      MSSV: student.studentId,
      Họ: student.firstName,
      Tên: student.lastName,
      Lớp: student.className,
      Email: student.email,
      "Chuyên ngành": student.major,
      "Trạng thái học tập": statusLabel[student.status],
      "Trạng thái TN":
        completionStatusLabel[student.graduationStatus || "not_achieved"],
      "Trạng thái TT":
        completionStatusLabel[student.internshipStatus || "not_achieved"],
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachSinhVien");

    worksheet["!cols"] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 20 },
      { wch: 10 },
      { wch: 15 },
      { wch: 30 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "DanhSachSinhVien.xlsx");
  };

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

  const isAllSelected =
    paginatedStudents &&
    paginatedStudents.length > 0 &&
    selectedRowIds.length === paginatedStudents.length;
  const isSomeSelected =
    selectedRowIds.length > 0 &&
    selectedRowIds.length < (paginatedStudents?.length ?? 0);

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return "0%";
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-4">
      <Collapsible open={isStatsOpen} onOpenChange={setIsStatsOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 text-xl font-semibold w-full">
            {isStatsOpen ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
            Thống kê theo lớp
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {isStatsOpen &&
            (classStatsByCourse && classStatsByCourse.length > 0 ? (
              classStatsByCourse.map((courseGroup) => (
                <Collapsible key={courseGroup.course} defaultOpen>
                  <CollapsibleTrigger className="w-full">
                    <h3 className="text-lg font-semibold flex items-center gap-2 py-2 border-b">
                      <ChevronDown className="h-4 w-4" />
                      Khóa {courseGroup.course} ({courseGroup.classes.length}{" "}
                      lớp)
                    </h3>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {courseGroup.classes.map((stat: any) => (
                        <Card key={stat.className}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                              {stat.className}
                            </CardTitle>
                            <CardDescription>
                              {stat.total} sinh viên
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="text-xs space-y-2">
                            <div>
                              <p className="font-semibold mb-1">
                                Trạng thái học tập
                              </p>
                              <div
                                className="flex items-center justify-between hover:bg-muted/50 rounded-md -mx-2 px-2 py-1 cursor-pointer"
                                onClick={() =>
                                  handleStatusClick(stat.className, "studying")
                                }
                              >
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "h-2 w-2 rounded-full",
                                      statusColorClass.studying,
                                      "bg-green-500"
                                    )}
                                  ></span>
                                  {statusLabel.studying}
                                </span>
                                <span>
                                  {stat.studying}{" "}
                                  <span className="text-muted-foreground">
                                    ({getPercentage(stat.studying, stat.total)})
                                  </span>
                                </span>
                              </div>
                              <div
                                className="flex items-center justify-between hover:bg-muted/50 rounded-md -mx-2 px-2 py-1 cursor-pointer"
                                onClick={() =>
                                  handleStatusClick(stat.className, "reserved")
                                }
                              >
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "h-2 w-2 rounded-full",
                                      statusColorClass.reserved,
                                      "bg-orange-500"
                                    )}
                                  ></span>
                                  {statusLabel.reserved}
                                </span>
                                <span>
                                  {stat.reserved}{" "}
                                  <span className="text-muted-foreground">
                                    ({getPercentage(stat.reserved, stat.total)})
                                  </span>
                                </span>
                              </div>
                              <div
                                className="flex items-center justify-between hover:bg-muted/50 rounded-md -mx-2 px-2 py-1 cursor-pointer"
                                onClick={() =>
                                  handleStatusClick(
                                    stat.className,
                                    "dropped_out"
                                  )
                                }
                              >
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "h-2 w-2 rounded-full",
                                      statusColorClass.dropped_out,
                                      "bg-red-500"
                                    )}
                                  ></span>
                                  {statusLabel.dropped_out}
                                </span>
                                <span>
                                  {stat.dropped_out}{" "}
                                  <span className="text-muted-foreground">
                                    (
                                    {getPercentage(
                                      stat.dropped_out,
                                      stat.total
                                    )}
                                    )
                                  </span>
                                </span>
                              </div>
                              <div
                                className="flex items-center justify-between hover:bg-muted/50 rounded-md -mx-2 px-2 py-1 cursor-pointer"
                                onClick={() =>
                                  handleStatusClick(stat.className, "graduated")
                                }
                              >
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "h-2 w-2 rounded-full",
                                      statusColorClass.graduated,
                                      "bg-blue-500"
                                    )}
                                  ></span>
                                  {statusLabel.graduated}
                                </span>
                                <span>
                                  {stat.graduated}{" "}
                                  <span className="text-muted-foreground">
                                    ({getPercentage(stat.graduated, stat.total)}
                                    )
                                  </span>
                                </span>
                              </div>
                            </div>
                            <Separator />
                            <div>
                              <p className="font-semibold mb-1">
                                Hoàn thành TN
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-green-600">
                                  <Check className="h-3 w-3" /> Đã đạt
                                </span>
                                <span>
                                  {stat.gradAchieved}{" "}
                                  <span className="text-muted-foreground">
                                    (
                                    {getPercentage(
                                      stat.gradAchieved,
                                      stat.total
                                    )}
                                    )
                                  </span>
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-red-600">
                                  <X className="h-3 w-3" /> Chưa đạt
                                </span>
                                <span>
                                  {stat.gradNotAchieved}{" "}
                                  <span className="text-muted-foreground">
                                    (
                                    {getPercentage(
                                      stat.gradNotAchieved,
                                      stat.total
                                    )}
                                    )
                                  </span>
                                </span>
                              </div>
                            </div>
                            <Separator />
                            <div>
                              <p className="font-semibold mb-1">
                                Hoàn thành TT
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-green-600">
                                  <Check className="h-3 w-3" /> Đã đạt
                                </span>
                                <span>
                                  {stat.internAchieved}{" "}
                                  <span className="text-muted-foreground">
                                    (
                                    {getPercentage(
                                      stat.internAchieved,
                                      stat.total
                                    )}
                                    )
                                  </span>
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-red-600">
                                  <X className="h-3 w-3" /> Chưa đạt
                                </span>
                                <span>
                                  {stat.internNotAchieved}{" "}
                                  <span className="text-muted-foreground">
                                    (
                                    {getPercentage(
                                      stat.internNotAchieved,
                                      stat.total
                                    )}
                                    )
                                  </span>
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            ) : (
              <Skeleton className="h-40 w-full" />
            ))}
        </CollapsibleContent>
      </Collapsible>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {selectedRowIds.length > 0 && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Users className="mr-2 h-4 w-4" />
                        Cập nhật trạng thái ({selectedRowIds.length})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => handleBatchStatusChange("studying")}
                      >
                        Đang học
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleBatchStatusChange("reserved")}
                      >
                        Bảo lưu
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleBatchStatusChange("dropped_out")}
                      >
                        Đã nghỉ học
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleBatchStatusChange("graduated")}
                      >
                        Đã tốt nghiệp
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Dialog
                    open={isAssignClassDialogOpen}
                    onOpenChange={setIsAssignClassDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Users className="mr-2 h-4 w-4" />
                        Xếp lớp ({selectedRowIds.length})
                      </Button>
                    </DialogTrigger>
                    <AssignClassDialog
                      studentIds={selectedRowIds}
                      allStudents={students || []}
                      onFinished={handleDialogFinished}
                    />
                  </Dialog>

                  <Dialog
                    open={isAssignMajorDialogOpen}
                    onOpenChange={setIsAssignMajorDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <GraduationCap className="mr-2 h-4 w-4" />
                        Gán ngành ({selectedRowIds.length})
                      </Button>
                    </DialogTrigger>
                    <AssignMajorDialog
                      studentIds={selectedRowIds}
                      allStudents={students || []}
                      onFinished={handleDialogFinished}
                    />
                  </Dialog>

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
                      allStudents={students || []}
                      onFinished={handleDialogFinished}
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
                </>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="flex w-full sm:w-auto gap-2">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Tìm kiếm theo tên, MSSV, lớp..."
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
                      <span className="sr-only sm:not-sr-only">Lọc</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Trạng thái TN</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={graduationStatusFilter === "all"}
                      onCheckedChange={() => setGraduationStatusFilter("all")}
                    >
                      Tất cả
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={graduationStatusFilter === "achieved"}
                      onCheckedChange={() =>
                        setGraduationStatusFilter("achieved")
                      }
                    >
                      Đã đạt
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={graduationStatusFilter === "not_achieved"}
                      onCheckedChange={() =>
                        setGraduationStatusFilter("not_achieved")
                      }
                    >
                      Chưa đạt
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Trạng thái TT</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={internshipStatusFilter === "all"}
                      onCheckedChange={() => setInternshipStatusFilter("all")}
                    >
                      Tất cả
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={internshipStatusFilter === "achieved"}
                      onCheckedChange={() =>
                        setInternshipStatusFilter("achieved")
                      }
                    >
                      Đã đạt
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={internshipStatusFilter === "not_achieved"}
                      onCheckedChange={() =>
                        setInternshipStatusFilter("not_achieved")
                      }
                    >
                      Chưa đạt
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Select value={majorFilter} onValueChange={setMajorFilter}>
                  <SelectTrigger className="w-[180px] h-9 text-sm">
                    <SelectValue placeholder="Lọc theo ngành" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả các ngành</SelectItem>
                    {uniqueMajors.map((major) => (
                      <SelectItem key={major} value={major}>
                        {major}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Popover
                  open={isCoursePopoverOpen}
                  onOpenChange={setIsCoursePopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-[150px] justify-between h-9 text-sm font-normal"
                    >
                      {courseFilter === "all"
                        ? "Tất cả khóa"
                        : `Khóa ${courseFilter}`}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[150px] p-0">
                    <Command>
                      <CommandInput placeholder="Tìm khóa..." />
                      <CommandEmpty>Không tìm thấy.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setCourseFilter("all");
                            setIsCoursePopoverOpen(false);
                          }}
                        >
                          Tất cả khóa
                        </CommandItem>
                        {uniqueCourses.map((course) => (
                          <CommandItem
                            key={course}
                            onSelect={() => {
                              setCourseFilter(course);
                              setIsCoursePopoverOpen(false);
                            }}
                          >
                            Khóa {course}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Popover
                  open={isClassPopoverOpen}
                  onOpenChange={setIsClassPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-[180px] justify-between h-9 text-sm font-normal"
                    >
                      {classFilter.length === 0
                        ? "Tất cả các lớp"
                        : classFilter.length === 1
                        ? classFilter[0]
                        : `${classFilter.length} lớp đã chọn`}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[180px] p-0">
                    <Command>
                      <CommandInput placeholder="Tìm lớp..." />
                      <CommandEmpty>Không tìm thấy lớp.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setClassFilter([]);
                            setIsClassPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              classFilter.length === 0
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          Tất cả các lớp
                        </CommandItem>
                        {uniqueClasses.map((className) => (
                          <CommandItem
                            key={className}
                            onSelect={() => {
                              const newSelection = classFilter.includes(
                                className
                              )
                                ? classFilter.filter(
                                    (item) => item !== className
                                  )
                                : [...classFilter, className];
                              setClassFilter(newSelection);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                classFilter.includes(className)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {className}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={exportToExcel}
                  variant="outline"
                  className="w-full"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Xuất Excel
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
                  <ImportStudentsDialog
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
                      Thêm Sinh viên
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Thêm Sinh viên mới</DialogTitle>
                      <DialogDescription>
                        Điền thông tin chi tiết để tạo một hồ sơ sinh viên mới.
                        Một tài khoản sẽ được tự động tạo.
                      </DialogDescription>
                    </DialogHeader>
                    <AddStudentForm
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
                    className="px-0 hover:bg-transparent"
                    onClick={() => requestSort("firstName")}
                  >
                    Họ và Tên {getSortIcon("firstName")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="px-0 hover:bg-transparent"
                    onClick={() => requestSort("studentId")}
                  >
                    MSSV {getSortIcon("studentId")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="px-0 hover:bg-transparent"
                    onClick={() => requestSort("className")}
                  >
                    Lớp {getSortIcon("className")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="px-0 hover:bg-transparent"
                    onClick={() => requestSort("major")}
                  >
                    Chuyên ngành {getSortIcon("major")}
                  </Button>
                </TableHead>
                <TableHead>TT Học tập</TableHead>
                <TableHead>TT Tốt nghiệp</TableHead>
                <TableHead>TT Thực tập</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStudents?.map((student, index) => (
                <TableRow
                  key={student.id}
                  data-state={selectedRowIds.includes(student.id) && "selected"}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedRowIds.includes(student.id)}
                      onCheckedChange={(checked) =>
                        handleRowSelect(student.id, !!checked)
                      }
                    />
                  </TableCell>
                  <TableCell>{pageState.startIndex + index + 1}</TableCell>
                  <TableCell className="font-medium">{`${student.firstName} ${student.lastName}`}</TableCell>
                  <TableCell>{student.studentId}</TableCell>
                  <TableCell>
                    {student.className || (
                      <span className="text-muted-foreground">Chưa có</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {student.major || (
                      <span className="text-muted-foreground">Chưa có</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "text-xs h-7 gap-1",
                            statusColorClass[student.status]
                          )}
                          size="sm"
                        >
                          <span>{statusLabel[student.status]}</span>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(
                          Object.keys(statusLabel) as Array<
                            keyof typeof statusLabel
                          >
                        ).map((status) => (
                          <DropdownMenuItem
                            key={status}
                            onClick={() =>
                              handleStatusChange(student.id, status)
                            }
                            disabled={student.status === status}
                          >
                            {statusLabel[status]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        student.graduationStatus === "achieved"
                          ? "default"
                          : "outline"
                      }
                    >
                      {
                        completionStatusLabel[
                          student.graduationStatus || "not_achieved"
                        ]
                      }
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        student.internshipStatus === "achieved"
                          ? "default"
                          : "outline"
                      }
                    >
                      {
                        completionStatusLabel[
                          student.internshipStatus || "not_achieved"
                        ]
                      }
                    </Badge>
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
                          onClick={() => handleEditClick(student)}
                        >
                          Sửa
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <span>Thay đổi trạng thái học tập</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(student.id, "studying")
                                }
                                disabled={student.status === "studying"}
                              >
                                {statusLabel.studying}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(student.id, "reserved")
                                }
                                disabled={student.status === "reserved"}
                              >
                                {statusLabel.reserved}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(student.id, "dropped_out")
                                }
                                disabled={student.status === "dropped_out"}
                              >
                                {statusLabel.dropped_out}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(student.id, "graduated")
                                }
                                disabled={student.status === "graduated"}
                              >
                                {statusLabel.graduated}
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <span>Cập nhật hoàn thành</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleCompletionStatusChange(
                                    student.id,
                                    "graduationStatus",
                                    student.graduationStatus === "achieved"
                                      ? "not_achieved"
                                      : "achieved"
                                  )
                                }
                              >
                                <GraduationCap className="mr-2 h-4 w-4" />
                                <span>
                                  {student.graduationStatus === "achieved"
                                    ? "Hủy đạt TN"
                                    : "Xác nhận đạt TN"}
                                </span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleCompletionStatusChange(
                                    student.id,
                                    "internshipStatus",
                                    student.internshipStatus === "achieved"
                                      ? "not_achieved"
                                      : "achieved"
                                  )
                                }
                              >
                                <Briefcase className="mr-2 h-4 w-4" />
                                <span>
                                  {student.internshipStatus === "achieved"
                                    ? "Hủy đạt TT"
                                    : "Xác nhận đạt TT"}
                                </span>
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteClick(student)}
                        >
                          Xóa
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
            <DialogTitle>Chỉnh sửa thông tin Sinh viên</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin chi tiết cho sinh viên.
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <EditStudentForm
              student={selectedStudent}
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
              viễn hồ sơ và tài khoản của{" "}
              {studentToDelete
                ? `sinh viên ${studentToDelete.firstName} ${studentToDelete.lastName}`
                : `${selectedRowIds.length} sinh viên đã chọn`}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStudentToDelete(null)}>
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

      <Dialog open={isStatusDetailOpen} onOpenChange={setIsStatusDetailOpen}>
        <StudentStatusDetailsDialog
          title={statusDetailData.title}
          students={statusDetailData.students}
          onFinished={() => setIsStatusDetailOpen(false)}
        />
      </Dialog>
    </div>
  );
}
