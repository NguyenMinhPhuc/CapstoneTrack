"use client";

import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  MoreHorizontal,
  Search,
  Check,
  X,
  Link as LinkIcon,
  FileUp,
  Trash2,
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
  updateDoc,
  query,
  where,
  writeBatch,
  deleteField,
} from "firebase/firestore";
import type {
  GraduationDefenseSession,
  DefenseRegistration,
  InternshipRegistrationStatus,
  ReportStatus,
  Student,
  InternshipCompany,
} from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Badge } from "./ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RejectionReasonDialog } from "./rejection-reason-dialog";
import { Checkbox } from "./ui/checkbox";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";

const registrationStatusLabel: Record<InternshipRegistrationStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
};

const registrationStatusVariant: Record<
  InternshipRegistrationStatus,
  "secondary" | "default" | "destructive"
> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

const registrationTypeLabel: Record<string, string> = {
  from_list: "Theo danh sách",
  self_arranged: "Tự tìm",
  early_internship: "Thực tập sớm",
  unknown: "Khác",
};

const reportStatusLabel: Record<ReportStatus, string> = {
  reporting: "Báo cáo",
  exempted: "Đặc cách",
  not_yet_reporting: "Chưa báo cáo",
  not_reporting: "Chưa ĐK",
  completed: "Hoàn thành",
};

const reportStatusVariant: Record<
  ReportStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  reporting: "default",
  exempted: "secondary",
  not_yet_reporting: "outline",
  not_reporting: "outline",
  completed: "default",
};

const statusLabel: Record<string, string> = {
  ongoing: "Đang diễn ra",
  upcoming: "Sắp diễn ra",
  completed: "Đã hoàn thành",
};

export function InternshipApprovalTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("all");
  const [selectedRegistrationStatus, setSelectedRegistrationStatus] = useState<
    "all" | InternshipRegistrationStatus
  >("all");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] =
    useState<DefenseRegistration | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] =
    useState<DefenseRegistration | null>(null);

  const sessionsQuery = useMemoFirebase(
    () => collection(firestore, "graduationDefenseSessions"),
    [firestore],
  );
  const { data: sessions, isLoading: isLoadingSessions } =
    useCollection<GraduationDefenseSession>(sessionsQuery);

  const registrationsQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, "defenseRegistrations"),
        where("internship_companyName", "!=", null),
      ),
    [firestore],
  );
  const { data: registrations, isLoading: isLoadingRegistrations } =
    useCollection<DefenseRegistration>(registrationsQuery);

  // Load students and companies to include contact info in exports
  const studentsQuery = useMemoFirebase(
    () => collection(firestore, "students"),
    [firestore],
  );
  const { data: students } = useCollection<Student>(studentsQuery);

  const companiesQuery = useMemoFirebase(
    () => collection(firestore, "internshipCompanies"),
    [firestore],
  );
  const { data: companies } = useCollection<InternshipCompany>(companiesQuery);

  useEffect(() => {
    setSelectedRowIds([]);
  }, [registrations]);

  useEffect(() => {
    setSelectedRowIds([]);
  }, [searchTerm, selectedSessionId, selectedRegistrationStatus]);

  const isLoading = isLoadingSessions || isLoadingRegistrations;

  const sessionMap = useMemo(() => {
    if (!sessions) return new Map();
    return new Map(sessions.map((s) => [s.id, s.name]));
  }, [sessions]);

  const groupedSessions = useMemo(() => {
    if (!sessions) return { ongoing: [], upcoming: [], completed: [] };
    return sessions.reduce(
      (acc, session) => {
        const group = acc[session.status] || [];
        group.push(session);
        acc[session.status] = group;
        return acc;
      },
      {} as Record<
        GraduationDefenseSession["status"],
        GraduationDefenseSession[]
      >,
    );
  }, [sessions]);

  const filteredRegistrations = useMemo(() => {
    if (!registrations) return [];

    return registrations.filter((reg) => {
      const sessionMatch =
        selectedSessionId === "all" || reg.sessionId === selectedSessionId;
      const statusMatch =
        selectedRegistrationStatus === "all" ||
        (reg.internshipRegistrationStatus || "pending") ===
          selectedRegistrationStatus;
      const term = searchTerm.toLowerCase();
      const searchMatch =
        reg.studentName.toLowerCase().includes(term) ||
        reg.studentId.toLowerCase().includes(term) ||
        reg.internship_companyName?.toLowerCase().includes(term);

      return sessionMatch && statusMatch && searchMatch;
    });
  }, [
    registrations,
    selectedSessionId,
    selectedRegistrationStatus,
    searchTerm,
  ]);

  const handleExportExcel = () => {
    try {
      // build lookup maps
      const studentMap = new Map<string, Student>();
      (students || []).forEach((s) => studentMap.set(s.id, s));
      const companyMap = new Map<string, InternshipCompany>();
      (companies || []).forEach((c) => companyMap.set(c.name, c));

      const rows = filteredRegistrations.map((reg, idx) => {
        const student = reg.studentDocId
          ? studentMap.get(reg.studentDocId)
          : undefined;
        const company = reg.internship_companyName
          ? companyMap.get(reg.internship_companyName)
          : undefined;
        return {
          STT: idx + 1,
          SinhVien: reg.studentName,
          MSSV: reg.studentId,
          SinhVien_NgaySinh:
            // support several possible field names for DOB
            (student as any)?.dateOfBirth?.toDate
              ? (student as any).dateOfBirth.toDate().toISOString().slice(0, 10)
              : (student as any)?.dateOfBirth || (student as any)?.dob || "",
          SinhVien_ChuyenNganh: student?.major || "",
          SinhVien_Email: student?.email || "",
          SinhVien_SDT: student?.phone || "",
          CongTy: reg.internship_companyName || "",
          HinhThucDangKy:
            registrationTypeLabel[
              reg.internship_registrationType ||
                (reg.internship_positionId ? "from_list" : "unknown")
            ] || registrationTypeLabel.unknown,
          CongTy_Email: company?.contactEmail || "",
          CongTy_SDT:
            company?.contactPhone ||
            reg.internship_companySupervisorPhone ||
            "",
          DotBaoCao: sessionMap.get(reg.sessionId) || "",
          TrangThaiDangKy:
            registrationStatusLabel[
              reg.internshipRegistrationStatus || "pending"
            ],
          TrangThaiBaoCao:
            reportStatusLabel[reg.internshipStatus || "not_reporting"],
          DonDangKy: reg.internship_registrationFormLink || "",
          GiayTiepNhan: reg.internship_acceptanceLetterLink || "",
          DonCamKet: reg.internship_commitmentFormLink || "",
          BaoCaoThucTap: reg.internship_reportLink || "",
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "DangKyThucTap");
      const filename = `dangky-thuctap-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      // set reasonable column widths
      worksheet["!cols"] = [
        { wch: 5 }, // STT
        { wch: 25 }, // SinhVien
        { wch: 12 }, // MSSV
        { wch: 12 }, // SinhVien_NgaySinh
        { wch: 20 }, // SinhVien_ChuyenNganh
        { wch: 25 }, // SinhVien_Email
        { wch: 15 }, // SinhVien_SDT
        { wch: 30 }, // CongTy
        { wch: 18 }, // HinhThucDangKy
        { wch: 25 }, // CongTy_Email
        { wch: 15 }, // CongTy_SDT
        { wch: 25 }, // DotBaoCao
        { wch: 15 }, // TrangThaiDangKy
        { wch: 15 }, // TrangThaiBaoCao
        { wch: 30 }, // DonDangKy
        { wch: 30 }, // GiayTiepNhan
        { wch: 30 }, // DonCamKet
        { wch: 30 }, // BaoCaoThucTap
      ];
      XLSX.writeFile(workbook, filename);
      toast({
        title: "Xuất Excel thành công",
        description: `Đã tạo file ${filename}`,
      });
    } catch (e: any) {
      console.error("Excel export error", e);
      toast({
        variant: "destructive",
        title: "Lỗi xuất Excel",
        description: e.message || "Không thể tạo file.",
      });
    }
  };

  const handleStatusChange = async (
    registrationId: string,
    newStatus: InternshipRegistrationStatus,
    reason?: string,
  ) => {
    const registrationDocRef = doc(
      firestore,
      "defenseRegistrations",
      registrationId,
    );

    const dataToUpdate: Partial<DefenseRegistration> = {
      internshipRegistrationStatus: newStatus,
      internshipStatusNote: newStatus === "rejected" ? reason : "",
    };

    if (newStatus === "approved") {
      dataToUpdate.internshipStatus = "not_yet_reporting";
    }

    updateDoc(registrationDocRef, dataToUpdate)
      .then(() => {
        toast({
          title: "Thành công",
          description: `Đã cập nhật trạng thái đăng ký.`,
        });
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: registrationDocRef.path,
          operation: "update",
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit("permission-error", contextualError);
      });
  };

  const handleConfirmReporting = async () => {
    if (selectedRowIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Chưa chọn sinh viên",
        description: "Vui lòng chọn ít nhất một sinh viên đã được duyệt.",
      });
      return;
    }

    const registrationsToUpdate = filteredRegistrations.filter(
      (reg) =>
        selectedRowIds.includes(reg.id) &&
        reg.internshipRegistrationStatus === "approved",
    );

    if (registrationsToUpdate.length === 0) {
      toast({
        variant: "destructive",
        title: "Không có sinh viên hợp lệ",
        description:
          "Chỉ có thể xác nhận báo cáo cho các sinh viên có đăng ký đã được duyệt.",
      });
      return;
    }

    const batch = writeBatch(firestore);
    registrationsToUpdate.forEach((reg) => {
      const docRef = doc(firestore, "defenseRegistrations", reg.id);
      batch.update(docRef, { internshipStatus: "reporting" });
    });

    try {
      await batch.commit();
      toast({
        title: "Thành công",
        description: `Đã xác nhận báo cáo cho ${registrationsToUpdate.length} sinh viên.`,
      });
      setSelectedRowIds([]);
    } catch (error) {
      console.error("Error confirming reporting status:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái báo cáo.",
      });
    }
  };

  const handleRejectClick = (registration: DefenseRegistration) => {
    setSelectedRegistration(registration);
    setIsRejectDialogOpen(true);
  };

  const handleDeleteClick = (registration: DefenseRegistration) => {
    setRegistrationToDelete(registration);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!registrationToDelete) return;

    const registrationDocRef = doc(
      firestore,
      "defenseRegistrations",
      registrationToDelete.id,
    );

    const dataToUpdate: any = {
      internship_companyName: deleteField(),
      internship_companyAddress: deleteField(),
      internship_companySupervisorName: deleteField(),
      internship_companySupervisorPhone: deleteField(),
      internship_registrationFormLink: deleteField(),
      internship_commitmentFormLink: deleteField(),
      internship_acceptanceLetterLink: deleteField(),
      internship_feedbackFormLink: deleteField(),
      internship_reportLink: deleteField(),
      internship_registrationType: deleteField(),
      internship_positionId: deleteField(),
      internship_positionTitle: deleteField(),
      internshipRegistrationStatus: deleteField(),
      internshipStatus: "not_reporting",
      internshipStatusNote: deleteField(),
      internshipSupervisorId: deleteField(),
      internshipSupervisorName: deleteField(),
    };

    try {
      await updateDoc(registrationDocRef, dataToUpdate);
      toast({
        title: "Xóa thành công",
        description: "Đã xóa dữ liệu đăng ký thực tập của sinh viên.",
      });
      setIsDeleteDialogOpen(false);
      setRegistrationToDelete(null);
    } catch (error) {
      console.error("Error deleting internship data:", error);
      const contextualError = new FirestorePermissionError({
        path: registrationDocRef.path,
        operation: "update",
        requestResourceData: dataToUpdate,
      });
      errorEmitter.emit("permission-error", contextualError);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể xóa dữ liệu đăng ký thực tập.",
      });
    }
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedRowIds(filteredRegistrations?.map((c) => c.id) || []);
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

  // Ensure hooks are called before any early return
  const {
    items: paginatedRegistrations,
    state: pageState,
    next,
    prev,
  } = usePagination(filteredRegistrations, 50);

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

  const isAllSelected =
    paginatedRegistrations &&
    paginatedRegistrations.length > 0 &&
    selectedRowIds.length === paginatedRegistrations.length;
  const isSomeSelected =
    selectedRowIds.length > 0 &&
    selectedRowIds.length < (paginatedRegistrations?.length ?? 0);

  return (
    <>
      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Danh sách Đăng ký</CardTitle>
                <CardDescription>
                  Xem xét và duyệt các đơn đăng ký thực tập của sinh viên.
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                {selectedRowIds.length > 0 && (
                  <Button onClick={handleConfirmReporting} size="sm">
                    <FileUp className="mr-2 h-4 w-4" />
                    Xác nhận Báo cáo ({selectedRowIds.length})
                  </Button>
                )}
                <Button onClick={handleExportExcel} variant="outline" size="sm">
                  Xuất Excel
                </Button>
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Tìm sinh viên, công ty..."
                    className="pl-8 w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select
                  value={selectedSessionId}
                  onValueChange={setSelectedSessionId}
                >
                  <SelectTrigger className="w-full sm:w-[250px]">
                    <SelectValue placeholder="Lọc theo đợt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả các đợt</SelectItem>
                    {Object.entries(groupedSessions).map(
                      ([status, sessionList]) =>
                        sessionList.length > 0 && (
                          <SelectGroup key={status}>
                            <SelectLabel>
                              {statusLabel[status] || status}
                            </SelectLabel>
                            {sessionList.map((session) => (
                              <SelectItem key={session.id} value={session.id}>
                                {session.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ),
                    )}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedRegistrationStatus}
                  onValueChange={(value) =>
                    setSelectedRegistrationStatus(
                      value as "all" | InternshipRegistrationStatus,
                    )
                  }
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Trạng thái ĐK" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    {(
                      Object.keys(
                        registrationStatusLabel,
                      ) as InternshipRegistrationStatus[]
                    ).map((status) => (
                      <SelectItem key={status} value={status}>
                        {registrationStatusLabel[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-md border max-h-[65vh]">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
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
                    <TableHead>Sinh viên</TableHead>
                    <TableHead>Công ty</TableHead>
                    <TableHead>Hình thức ĐK</TableHead>
                    <TableHead>Đợt báo cáo</TableHead>
                    <TableHead>Trạng thái ĐK</TableHead>
                    <TableHead>Trạng thái BC</TableHead>
                    <TableHead className="text-center">Minh chứng</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRegistrations.length > 0 ? (
                    paginatedRegistrations.map((reg, index) => (
                      <TableRow
                        key={reg.id}
                        data-state={
                          selectedRowIds.includes(reg.id) && "selected"
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedRowIds.includes(reg.id)}
                            onCheckedChange={(checked) =>
                              handleRowSelect(reg.id, !!checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {pageState.startIndex + index + 1}
                        </TableCell>
                        <TableCell>
                          <div>{reg.studentName}</div>
                          <div className="text-xs text-muted-foreground">
                            {reg.studentId}
                          </div>
                        </TableCell>
                        <TableCell>{reg.internship_companyName}</TableCell>
                        <TableCell>
                          {registrationTypeLabel[
                            reg.internship_registrationType ||
                              (reg.internship_positionId
                                ? "from_list"
                                : "unknown")
                          ] || registrationTypeLabel.unknown}
                        </TableCell>
                        <TableCell>{sessionMap.get(reg.sessionId)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <span className="inline-flex cursor-pointer">
                                <Badge
                                  variant={
                                    registrationStatusVariant[
                                      reg.internshipRegistrationStatus ||
                                        "pending"
                                    ]
                                  }
                                >
                                  {
                                    registrationStatusLabel[
                                      reg.internshipRegistrationStatus ||
                                        "pending"
                                    ]
                                  }
                                </Badge>
                              </span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(reg.id, "approved")
                                }
                                disabled={
                                  reg.internshipRegistrationStatus ===
                                  "approved"
                                }
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Duyệt
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleRejectClick(reg);
                                }}
                                disabled={
                                  reg.internshipRegistrationStatus ===
                                  "rejected"
                                }
                              >
                                <X className="mr-2 h-4 w-4" />
                                Từ chối
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(reg.id, "pending")
                                }
                                disabled={
                                  (reg.internshipRegistrationStatus ||
                                    "pending") === "pending"
                                }
                              >
                                Đưa về chờ duyệt
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              reportStatusVariant[
                                reg.internshipStatus || "not_reporting"
                              ]
                            }
                          >
                            {
                              reportStatusLabel[
                                reg.internshipStatus || "not_reporting"
                              ]
                            }
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center items-center gap-4">
                            {renderLinkCell(
                              reg.internship_registrationFormLink,
                              "Đơn đăng ký",
                            )}
                            {renderLinkCell(
                              reg.internship_acceptanceLetterLink,
                              "Giấy tiếp nhận",
                            )}
                            {renderLinkCell(
                              reg.internship_commitmentFormLink,
                              "Đơn cam kết",
                            )}
                            {renderLinkCell(
                              reg.internship_reportLink,
                              "Báo cáo thực tập",
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
                                onClick={() =>
                                  handleStatusChange(reg.id, "approved")
                                }
                                disabled={
                                  reg.internshipRegistrationStatus ===
                                  "approved"
                                }
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Duyệt
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleRejectClick(reg);
                                }}
                                disabled={
                                  reg.internshipRegistrationStatus ===
                                  "rejected"
                                }
                              >
                                <X className="mr-2 h-4 w-4" />
                                Từ chối
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleDeleteClick(reg);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Xóa dữ liệu ĐK
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        Không có đơn đăng ký thực tập nào cần duyệt.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <PaginationControls
                state={pageState}
                onPrev={prev}
                onNext={next}
              />
            </div>
          </CardContent>
        </Card>
      )}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogTitle>Từ chối đăng ký</DialogTitle>
          {selectedRegistration && (
            <RejectionReasonDialog
              registration={selectedRegistration}
              onConfirm={(reason) => {
                handleStatusChange(selectedRegistration.id, "rejected", reason);
                setIsRejectDialogOpen(false);
                setSelectedRegistration(null);
              }}
              onCancel={() => {
                setIsRejectDialogOpen(false);
                setSelectedRegistration(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Xác nhận xóa dữ liệu</DialogTitle>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Bạn có chắc chắn muốn xóa toàn bộ dữ liệu đăng ký thực tập của
                sinh viên{" "}
                <span className="font-semibold">
                  {registrationToDelete?.studentName}
                </span>{" "}
                (
                <span className="font-mono">
                  {registrationToDelete?.studentId}
                </span>
                )?
              </p>
              <p className="text-sm text-destructive">
                Hành động này sẽ xóa tất cả thông tin công ty, giám sát viên, và
                các link minh chứng đăng ký thực tập. Sinh viên có thể đăng ký
                lại vào đợt khác nếu cần.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setRegistrationToDelete(null);
                }}
              >
                Hủy
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa dữ liệu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
