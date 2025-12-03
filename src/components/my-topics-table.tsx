"use client";

import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
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
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
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
  Upload,
  FileDown,
  Activity,
  AlertTriangle,
  Move,
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
import { AddTopicForm } from "./add-topic-form";
import { ImportTopicsDialog } from "./import-topics-dialog";
import { EditTopicForm } from "./edit-topic-form";
import { Badge } from "./ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { ViewProgressDialog } from "./view-progress-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Checkbox } from "./ui/checkbox";
import { MoveTopicsDialog } from "./move-topics-dialog";
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
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

interface MyTopicsTableProps {
  supervisorId: string;
  supervisorName: string;
}

const statusLabel: Record<ProjectTopic["status"], string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
  taken: "Đã có SV",
};

const statusVariant: Record<
  ProjectTopic["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  taken: "outline",
};

const registrationStatusLabel: Record<string, string> = {
  pending: "Chờ xác nhận",
  approved: "Đã xác nhận",
  rejected: "Đã từ chối",
};

const registrationStatusVariant: Record<
  string,
  "secondary" | "default" | "destructive"
> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

const proposalStatusLabel: Record<string, string> = {
  not_submitted: "Chưa nộp TM",
  pending_approval: "Chờ duyệt TM",
  approved: "Đã duyệt TM",
  rejected: "TM bị từ chối",
};

const proposalStatusVariant: Record<
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

const reportStatusVariant: Record<
  string,
  "outline" | "secondary" | "default" | "destructive"
> = {
  not_submitted: "outline",
  pending_approval: "secondary",
  approved: "default",
  rejected: "destructive",
};

export function MyTopicsTable({
  supervisorId,
  supervisorName,
}: MyTopicsTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const [selectedTopic, setSelectedTopic] = useState<ProjectTopic | null>(null);
  const [selectedRegistration, setSelectedRegistration] =
    useState<DefenseRegistration | null>(null);
  const [sessionFilter, setSessionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isSessionPopoverOpen, setIsSessionPopoverOpen] = useState(false);

  const topicsQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, "projectTopics"),
        where("supervisorId", "==", supervisorId)
      ),
    [firestore, supervisorId]
  );
  const {
    data: topics,
    isLoading: isLoadingTopics,
    forceRefresh: forceRefreshTopics,
  } = useCollection<ProjectTopic>(topicsQuery);

  const sessionsQuery = useMemoFirebase(
    () => collection(firestore, "graduationDefenseSessions"),
    [firestore]
  );
  const { data: sessions, isLoading: isLoadingSessions } =
    useCollection<GraduationDefenseSession>(sessionsQuery);

  const registrationsQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, "defenseRegistrations"),
        where("supervisorId", "==", supervisorId)
      ),
    [firestore, supervisorId]
  );
  const {
    data: allRegistrations,
    isLoading: isLoadingRegs,
    forceRefresh: forceRefreshRegs,
  } = useCollection<DefenseRegistration>(registrationsQuery);

  useEffect(() => {
    setSelectedRowIds([]);
  }, [topics, sessionFilter, statusFilter]);

  const graduationSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter(
      (s) => s.sessionType === "graduation" || s.sessionType === "combined"
    );
  }, [sessions]);

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

  const handleExportTemplate = () => {
    const sampleData = [
      {
        title: "Xây dựng hệ thống quản lý đề tài tốt nghiệp",
        field: "Công nghệ phần mềm",
        summary:
          "Phát triển ứng dụng web giúp quản lý quy trình đăng ký, theo dõi và chấm điểm đề tài tốt nghiệp cho sinh viên.",
        objectives:
          "- Nghiên cứu quy trình quản lý đề tài hiện tại\n- Thiết kế kiến trúc hệ thống\n- Xây dựng giao diện người dùng\n- Triển khai các tính năng chính",
        expectedResults:
          "- Ứng dụng web hoàn chỉnh\n- Tài liệu hướng dẫn sử dụng\n- Source code và database",
        maxStudents: 2,
      },
      {
        title: "Ứng dụng trí tuệ nhân tạo trong phân tích cảm xúc văn bản",
        field: "Trí tuệ nhân tạo, Xử lý ngôn ngữ tự nhiên",
        summary:
          "Nghiên cứu và xây dựng mô hình AI để phân tích cảm xúc từ văn bản tiếng Việt trên mạng xã hội.",
        objectives:
          "- Thu thập và tiền xử lý dữ liệu văn bản\n- Nghiên cứu các mô hình NLP\n- Huấn luyện và đánh giá mô hình\n- Xây dựng API demo",
        expectedResults:
          "- Mô hình phân loại cảm xúc với độ chính xác >80%\n- API service\n- Báo cáo nghiên cứu chi tiết",
        maxStudents: 1,
      },
      {
        title: "Hệ thống IoT giám sát và điều khiển nhà thông minh",
        field: "Internet of Things, Embedded Systems",
        summary:
          "Thiết kế và triển khai hệ thống IoT tích hợp cảm biến và thiết bị điều khiển cho nhà thông minh.",
        objectives:
          "- Thiết kế kiến trúc hệ thống IoT\n- Lập trình các module cảm biến\n- Xây dựng ứng dụng điều khiển\n- Tích hợp và thử nghiệm",
        expectedResults:
          "- Hệ thống phần cứng hoạt động\n- Ứng dụng mobile điều khiển\n- Tài liệu kỹ thuật",
        maxStudents: 2,
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachDeTai");
    worksheet["!cols"] = [
      { wch: 50 }, // title
      { wch: 30 }, // field
      { wch: 60 }, // summary
      { wch: 50 }, // objectives
      { wch: 50 }, // expectedResults
      { wch: 12 }, // maxStudents
    ];
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "Template_DeTai.xlsx");
  };

  const registrationsByTopic = useMemo(() => {
    const map = new Map<string, DefenseRegistration[]>();
    if (allRegistrations) {
      allRegistrations.forEach((reg) => {
        if (reg.projectTitle) {
          // A composite key is more specific to avoid collisions between different sessions
          const key = `${reg.sessionId}-${reg.projectTitle}`;
          if (!map.has(key)) {
            map.set(key, []);
          }
          map.get(key)?.push(reg);
        }
      });
    }
    return map;
  }, [allRegistrations]);

  const filteredTopics = useMemo(() => {
    if (!topics) return [];

    return topics.filter((topic) => {
      const sessionMatch =
        sessionFilter === "all" || topic.sessionId === sessionFilter;
      const statusMatch =
        statusFilter === "all" || topic.status === statusFilter;
      return sessionMatch && statusMatch;
    });
  }, [topics, sessionFilter, statusFilter]);

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedRowIds(filteredTopics?.map((t) => t.id) || []);
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

  const handleMoveFinished = () => {
    setIsMoveDialogOpen(false);
    setSelectedRowIds([]);
  };

  const handleEditClick = (topic: ProjectTopic) => {
    setSelectedTopic(topic);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (topic: ProjectTopic) => {
    setSelectedTopic(topic);
    setIsDeleteDialogOpen(true);
  };

  const handleViewDetailsClick = (topic: ProjectTopic) => {
    setSelectedTopic(topic);
    setIsDetailsDialogOpen(true);
  };

  const handleViewProposalClick = (registration: DefenseRegistration) => {
    setSelectedRegistration(registration);
    setIsProposalDialogOpen(true);
  };

  const handleViewReportClick = (registration: DefenseRegistration) => {
    setSelectedRegistration(registration);
    setIsReportDialogOpen(true);
  };

  const handleViewProgressClick = (registration: DefenseRegistration) => {
    setSelectedRegistration(registration);
    setIsProgressDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedTopic) return;
    try {
      await deleteDoc(doc(firestore, "projectTopics", selectedTopic.id));
      toast({
        title: "Thành công",
        description: `Đề tài "${selectedTopic.title}" đã được xóa.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: `Không thể xóa đề tài: ${error.message}`,
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedTopic(null);
    }
  };

  const handleRegistrationAction = async (
    registrationId: string,
    topic: ProjectTopic,
    action: "approve" | "reject" | "cancel"
  ) => {
    const regDocRef = doc(firestore, "defenseRegistrations", registrationId);
    const topicRef = doc(firestore, "projectTopics", topic.id);
    const batch = writeBatch(firestore);

    if (action === "approve") {
      batch.update(regDocRef, { projectRegistrationStatus: "approved" });

      const key = `${topic.sessionId}-${topic.title}`;
      const registrationsForThisTopic = registrationsByTopic.get(key) || [];
      const approvedCount = registrationsForThisTopic.filter(
        (r) => r.projectRegistrationStatus === "approved"
      ).length;

      if (approvedCount + 1 >= topic.maxStudents) {
        batch.update(topicRef, { status: "taken" });
      }
    } else {
      batch.update(regDocRef, {
        projectRegistrationStatus: action === "reject" ? "rejected" : null,
        projectTitle: "",
        summary: "",
        objectives: "",
        expectedResults: "",
        supervisorId: "",
        supervisorName: "",
      });

      if (topic.status === "taken") {
        batch.update(topicRef, { status: "approved" });
      }
    }

    try {
      await batch.commit();
      const successMessage =
        action === "approve"
          ? "Đã xác nhận hướng dẫn sinh viên."
          : action === "reject"
          ? "Đã từ chối hướng dẫn."
          : "Đã hủy đăng ký cho sinh viên.";
      toast({ title: "Thành công", description: successMessage });
      forceRefreshTopics();
      forceRefreshRegs();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: `Không thể cập nhật: ${error.message}`,
      });
      const contextualError = new FirestorePermissionError({
        path: `batch write on topic ${topic.id} and registration ${registrationId}`,
        operation: "update",
      });
      errorEmitter.emit("permission-error", contextualError);
    }
  };

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

  const isLoading = isLoadingTopics || isLoadingSessions || isLoadingRegs;

  const isAllSelected =
    filteredTopics &&
    selectedRowIds.length > 0 &&
    selectedRowIds.length === filteredTopics.length;
  const isSomeSelected =
    selectedRowIds.length > 0 &&
    (!filteredTopics || selectedRowIds.length < filteredTopics.length);

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách Đề tài</CardTitle>
              <CardDescription>
                Các đề tài bạn đã đề xuất. Nhấp vào hàng để xem chi tiết.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
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

              <Popover
                open={isSessionPopoverOpen}
                onOpenChange={setIsSessionPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isSessionPopoverOpen}
                    className="w-[250px] justify-between"
                  >
                    {sessionFilter === "all"
                      ? "Tất cả các đợt"
                      : sessionMap.get(sessionFilter) || "Chọn đợt..."}
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
                            setSessionFilter("all");
                            setIsSessionPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              sessionFilter === "all"
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          Tất cả các đợt
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
                                      setSessionFilter(session.id);
                                      setIsSessionPopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        sessionFilter === session.id
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

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Thêm Đề tài
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <AddTopicForm
                    supervisorId={supervisorId}
                    supervisorName={supervisorName}
                    sessions={graduationSessions || []}
                    onFinished={() => setIsAddDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                onClick={handleExportTemplate}
                title="Xuất mẫu Excel"
              >
                <FileDown className="mr-2 h-4 w-4" /> Xuất mẫu
              </Button>

              <Dialog
                open={isImportDialogOpen}
                onOpenChange={setIsImportDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" title="Nhập từ Excel">
                    <Upload className="mr-2 h-4 w-4" /> Nhập từ Excel
                  </Button>
                </DialogTrigger>
                <ImportTopicsDialog
                  supervisorId={supervisorId}
                  supervisorName={supervisorName}
                  sessions={graduationSessions as any}
                  onFinished={() => setIsImportDialogOpen(false)}
                />
              </Dialog>
            </div>
          </div>
          {selectedRowIds.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <Dialog
                open={isMoveDialogOpen}
                onOpenChange={setIsMoveDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Move className="mr-2 h-4 w-4" />
                    Chuyển sang đợt khác ({selectedRowIds.length})
                  </Button>
                </DialogTrigger>
                <MoveTopicsDialog
                  sessions={graduationSessions || []}
                  topicIds={selectedRowIds}
                  onFinished={handleMoveFinished}
                />
              </Dialog>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <div className="grid grid-cols-12 w-full text-left text-sm font-semibold items-center gap-4 px-4 py-2 bg-muted/50">
              <div className="col-span-1 text-center">STT</div>
              <div className="col-span-4">Tên đề tài</div>
              <div className="col-span-2">Giáo viên hướng dẫn</div>
              <div className="col-span-2">Đợt báo cáo</div>
              <div className="col-span-1 text-center">SL SV</div>
              <div className="col-span-1">Trạng thái</div>
              <div className="col-span-1 text-right pr-8">Hành động</div>
            </div>
            <Accordion type="multiple" className="space-y-2">
              {filteredTopics.length > 0 ? (
                filteredTopics.map((topic, index) => {
                  const key = `${topic.sessionId}-${topic.title}`;
                  const registeredStudents =
                    registrationsByTopic.get(key) || [];
                  const registeredCount = registeredStudents.length;

                  return (
                    <AccordionItem
                      value={topic.id}
                      key={topic.id}
                      className="border-b"
                    >
                      <div className="flex items-center px-4 hover:bg-muted/50">
                        <AccordionTrigger className="w-full py-0 hover:no-underline flex-1">
                          <div className="grid grid-cols-12 w-full text-left text-sm items-center gap-4 py-4">
                            <div className="col-span-1 text-center">
                              {index + 1}
                            </div>
                            <div
                              className="col-span-4 font-medium truncate"
                              title={topic.title}
                            >
                              {topic.title}
                            </div>
                            <div className="col-span-2 truncate">
                              {topic.supervisorName}
                            </div>
                            <div className="col-span-2 truncate">
                              {sessionMap.get(topic.sessionId) || "N/A"}
                            </div>
                            <div className="col-span-1 text-center">
                              {topic.maxStudents}
                            </div>
                            <div className="col-span-1">
                              <Badge variant={statusVariant[topic.status]}>
                                {statusLabel[topic.status]}
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <div className="col-span-1 flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleViewDetailsClick(topic)}
                              >
                                Xem chi tiết
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditClick(topic)}
                                disabled={topic.status === "taken"}
                              >
                                Sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteClick(topic)}
                                disabled={topic.status === "taken"}
                              >
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <AccordionContent>
                        <div className="p-4 bg-muted/30 border-t space-y-4">
                          <h4 className="font-semibold text-sm">
                            Danh sách Sinh viên đăng ký ({registeredCount})
                          </h4>
                          {registeredStudents.length > 0 ? (
                            <div className="space-y-2">
                              {registeredStudents.map((reg) => (
                                <div
                                  key={reg.id}
                                  className="flex items-center justify-between p-2 border rounded-md bg-background"
                                >
                                  <div>
                                    <p className="font-medium">
                                      {reg.studentName} ({reg.studentId})
                                    </p>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                      <Badge
                                        variant={
                                          registrationStatusVariant[
                                            reg.projectRegistrationStatus ||
                                              "pending"
                                          ]
                                        }
                                      >
                                        {
                                          registrationStatusLabel[
                                            reg.projectRegistrationStatus ||
                                              "pending"
                                          ]
                                        }
                                      </Badge>
                                      <Badge
                                        variant={
                                          proposalStatusVariant[
                                            reg.proposalStatus ||
                                              "not_submitted"
                                          ]
                                        }
                                      >
                                        {
                                          proposalStatusLabel[
                                            reg.proposalStatus ||
                                              "not_submitted"
                                          ]
                                        }
                                      </Badge>
                                      <Badge
                                        variant={
                                          reportStatusVariant[
                                            reg.reportStatus || "not_submitted"
                                          ]
                                        }
                                      >
                                        {
                                          reportStatusLabel[
                                            reg.reportStatus || "not_submitted"
                                          ]
                                        }
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleViewProgressClick(reg)
                                          }
                                        >
                                          <Activity className="mr-2 h-4 w-4" />
                                          Xem tiến độ
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleViewProposalClick(reg)
                                          }
                                          disabled={
                                            !reg.proposalStatus ||
                                            reg.proposalStatus ===
                                              "not_submitted"
                                          }
                                        >
                                          <FileSignature className="mr-2 h-4 w-4" />
                                          Duyệt thuyết minh
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleViewReportClick(reg)
                                          }
                                          disabled={
                                            !reg.reportStatus ||
                                            reg.reportStatus === "not_submitted"
                                          }
                                        >
                                          <FileUp className="mr-2 h-4 w-4" />
                                          Duyệt báo cáo
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>

                                    {reg.projectRegistrationStatus ===
                                      "pending" && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            handleRegistrationAction(
                                              reg.id,
                                              topic,
                                              "approve"
                                            )
                                          }
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() =>
                                            handleRegistrationAction(
                                              reg.id,
                                              topic,
                                              "reject"
                                            )
                                          }
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                    {reg.projectRegistrationStatus ===
                                      "approved" && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() =>
                                          handleRegistrationAction(
                                            reg.id,
                                            topic,
                                            "cancel"
                                          )
                                        }
                                      >
                                        Hủy ĐK
                                      </Button>
                                    )}
                                    {reg.projectRegistrationStatus ===
                                      "rejected" && (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                          handleRegistrationAction(
                                            reg.id,
                                            topic,
                                            "approve"
                                          )
                                        }
                                      >
                                        Duyệt lại
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              Chưa có sinh viên nào đăng ký đề tài này.
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })
              ) : (
                <div className="text-center py-10 text-muted-foreground col-span-12">
                  Không có đề tài nào phù hợp.
                </div>
              )}
            </Accordion>
          </div>
          {filteredTopics.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              Không có đề tài nào phù hợp.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedTopic && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTopic.title}</DialogTitle>
                <DialogDescription>
                  GVHD: {selectedTopic.supervisorName} | Đợt:{" "}
                  {sessionMap.get(selectedTopic.sessionId)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 max-h-[60vh] overflow-y-auto p-1">
                {selectedTopic.status === "rejected" &&
                  selectedTopic.rejectionReason && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Lý do từ chối</AlertTitle>
                      <AlertDescription>
                        {selectedTopic.rejectionReason}
                      </AlertDescription>
                    </Alert>
                  )}
                <div className="space-y-1">
                  <h4 className="font-semibold flex items-center gap-2 text-base">
                    <Book className="h-4 w-4 text-primary" /> Tóm tắt
                  </h4>
                  <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedTopic.summary || ""}
                    </ReactMarkdown>
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold flex items-center gap-2 text-base">
                    <Target className="h-4 w-4 text-primary" /> Mục tiêu
                  </h4>
                  <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedTopic.objectives || ""}
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
                      {selectedTopic.expectedResults || ""}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedTopic && (
            <EditTopicForm
              topic={selectedTopic}
              sessions={graduationSessions || []}
              onFinished={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

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

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Đề tài sẽ bị xóa vĩnh viễn.
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
