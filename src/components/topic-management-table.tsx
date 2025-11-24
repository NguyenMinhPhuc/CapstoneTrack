"use client";

import { useState, useMemo } from "react";
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
  Search,
  Book,
  Target,
  CheckCircle,
  AlertTriangle,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc, query } from "firebase/firestore";
import type {
  ProjectTopic,
  GraduationDefenseSession,
  DefenseRegistration,
} from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "./ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import { RejectTopicDialog } from "./reject-topic-dialog";
import { Dialog, DialogContent } from "./ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { cn } from "@/lib/utils";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "./ui/pagination-controls";

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

export function TopicManagementTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [sessionFilter, setSessionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [topicToReject, setTopicToReject] = useState<ProjectTopic | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isSessionPopoverOpen, setIsSessionPopoverOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const topicsQuery = useMemoFirebase(
    () => query(collection(firestore, "projectTopics")),
    [firestore]
  );
  const { data: topics, isLoading: isLoadingTopics } =
    useCollection<ProjectTopic>(topicsQuery);

  // Fetch all registrations (used for counting students guided per teacher/topic)
  const registrationsQuery = useMemoFirebase(
    () => collection(firestore, "defenseRegistrations"),
    [firestore]
  );
  const { data: registrations, isLoading: isLoadingRegistrations } =
    useCollection<DefenseRegistration>(registrationsQuery);

  const sessionsQuery = useMemoFirebase(
    () => collection(firestore, "graduationDefenseSessions"),
    [firestore]
  );
  const { data: sessions, isLoading: isLoadingSessions } =
    useCollection<GraduationDefenseSession>(sessionsQuery);

  const sessionMap = useMemo(() => {
    if (!sessions) return new Map();
    return new Map(sessions.map((s) => [s.id, s.name]));
  }, [sessions]);

  const groupedSessions = useMemo(() => {
    if (!sessions) return { ongoing: [], upcoming: [], completed: [] };
    return sessions.reduce((acc, session) => {
      const group = acc[session.status] || [];
      group.push(session);
      acc[session.status] = group;
      return acc;
    }, {} as Record<GraduationDefenseSession["status"], GraduationDefenseSession[]>);
  }, [sessions]);

  const filteredTopics = useMemo(() => {
    if (!topics) return [];

    return topics.filter((topic) => {
      const sessionMatch =
        sessionFilter === "all" || topic.sessionId === sessionFilter;
      const statusMatch =
        statusFilter === "all" || topic.status === statusFilter;
      const term = searchTerm.toLowerCase();
      const searchMatch =
        topic.title.toLowerCase().includes(term) ||
        topic.supervisorName.toLowerCase().includes(term) ||
        (topic.field && topic.field.toLowerCase().includes(term));

      return sessionMatch && statusMatch && searchMatch;
    });
  }, [topics, sessionFilter, statusFilter, searchTerm]);

  const {
    items: paginatedTopics,
    state: pagination,
    next,
    prev,
  } = usePagination(filteredTopics, 50);

  const handleStatusChange = async (
    topicId: string,
    newStatus: ProjectTopic["status"],
    reason?: string
  ) => {
    const topicRef = doc(firestore, "projectTopics", topicId);

    if (newStatus === "rejected" && !reason) {
      const topic = topics?.find((t) => t.id === topicId);
      if (topic) {
        setTopicToReject(topic);
        setIsRejectDialogOpen(true);
      }
      return;
    }

    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "rejected" && reason) {
        updateData.rejectionReason = reason;
      } else if (newStatus !== "rejected") {
        updateData.rejectionReason = ""; // Clear reason if not rejected
      }

      await updateDoc(topicRef, updateData);
      toast({
        title: "Thành công",
        description: `Trạng thái đề tài đã được cập nhật.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: `Không thể cập nhật trạng thái: ${error.message}`,
      });
    }
  };

  const isLoading =
    isLoadingTopics || isLoadingSessions || isLoadingRegistrations;

  // Compute per-teacher stats based on CURRENT filtered topics and registrations
  const teacherStats = useMemo(() => {
    if (!filteredTopics.length || !registrations)
      return [] as Array<{
        supervisorId: string;
        supervisorName: string;
        topicCount: number;
        studentCount: number;
      }>;

    // Build map for topic counts per supervisor
    const map = new Map<
      string,
      {
        supervisorName: string;
        topicCount: number;
        studentCount: number;
        keys: Set<string>;
      }
    >();
    filteredTopics.forEach((t) => {
      const entry = map.get(t.supervisorId) || {
        supervisorName: t.supervisorName,
        topicCount: 0,
        studentCount: 0,
        keys: new Set<string>(),
      };
      entry.topicCount += 1;
      // Composite key used in registrations (sessionId-title-supervisorId)
      entry.keys.add(`${t.sessionId}-${t.title}-${t.supervisorId}`);
      map.set(t.supervisorId, entry);
    });

    // Count students per topic key if matches supervisor and not rejected
    registrations.forEach((reg) => {
      if (!reg.supervisorId || !reg.projectTitle) return;
      if (reg.projectRegistrationStatus === "rejected") return;
      const key = `${reg.sessionId}-${reg.projectTitle}-${reg.supervisorId}`;
      const entry = map.get(reg.supervisorId);
      if (entry && entry.keys.has(key)) {
        entry.studentCount += 1;
      }
    });

    // Build final array
    return Array.from(map.entries())
      .map(([supervisorId, v]) => ({
        supervisorId,
        supervisorName: v.supervisorName,
        topicCount: v.topicCount,
        studentCount: v.studentCount,
      }))
      .sort((a, b) => a.supervisorName.localeCompare(b.supervisorName));
  }, [filteredTopics, registrations]);

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
                Xem và duyệt các đề tài do giáo viên đề xuất.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Tìm theo tên đề tài, GV, lĩnh vực..."
                  className="pl-8 w-full sm:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {teacherStats.length > 0 && (
            <div className="mb-4 space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStats((v) => !v)}
              >
                {showStats ? "Ẩn thống kê GV" : "Hiển thị thống kê GV"} (
                {teacherStats.length} GV)
              </Button>
              {showStats && (
                <div className="text-sm space-y-1 animate-in fade-in-50">
                  <div className="font-medium">
                    Thống kê theo GV (lọc hiện tại):
                  </div>
                  <div className="grid gap-1 md:grid-cols-2 lg:grid-cols-3">
                    {teacherStats.map((s) => (
                      <div
                        key={s.supervisorId}
                        className="flex items-center justify-between rounded border px-2 py-1 bg-muted/40"
                      >
                        <span className="truncate" title={s.supervisorName}>
                          {s.supervisorName}
                        </span>
                        <span className="text-muted-foreground">
                          {s.topicCount} đề tài / {s.studentCount} SV
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
              {paginatedTopics.map((topic, index) => (
                <AccordionItem
                  value={topic.id}
                  key={topic.id}
                  className="border-b"
                >
                  <div className="flex items-center px-4 hover:bg-muted/50">
                    <AccordionTrigger className="w-full py-0 hover:no-underline flex-1">
                      <div className="grid grid-cols-12 w-full text-left text-sm items-center gap-4 py-4">
                        <div className="col-span-1 text-center">
                          {pagination.startIndex + index + 1}
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
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <span>Thay đổi trạng thái</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                {(
                                  Object.keys(statusLabel) as Array<
                                    keyof typeof statusLabel
                                  >
                                ).map((status) => (
                                  <DropdownMenuItem
                                    key={status}
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      handleStatusChange(topic.id, status);
                                    }}
                                    disabled={topic.status === status}
                                  >
                                    {statusLabel[status]}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <AccordionContent className="pt-4 pb-4 px-4 border-t">
                    <div className="space-y-6">
                      {topic.status === "rejected" && topic.rejectionReason && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Lý do từ chối</AlertTitle>
                          <AlertDescription>
                            {topic.rejectionReason}
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="space-y-1">
                        <h4 className="font-semibold flex items-center gap-2 text-base">
                          <Book className="h-4 w-4 text-primary" /> Tóm tắt
                        </h4>
                        <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {topic.summary || ""}
                          </ReactMarkdown>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold flex items-center gap-2 text-base">
                          <Target className="h-4 w-4 text-primary" /> Mục tiêu
                        </h4>
                        <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {topic.objectives || ""}
                          </ReactMarkdown>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold flex items-center gap-2 text-base">
                          <CheckCircle className="h-4 w-4 text-primary" /> Kết
                          quả mong đợi
                        </h4>
                        <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {topic.expectedResults || ""}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {filteredTopics.length > 0 && (
              <div className="mt-4">
                <PaginationControls
                  state={pagination}
                  onPrev={prev}
                  onNext={next}
                />
              </div>
            )}
          </div>
          {filteredTopics.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              Không tìm thấy đề tài nào phù hợp.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          {topicToReject && (
            <RejectTopicDialog
              topic={topicToReject}
              onConfirm={(reason) => {
                handleStatusChange(topicToReject.id, "rejected", reason);
                setIsRejectDialogOpen(false);
                setTopicToReject(null);
              }}
              onCancel={() => {
                setIsRejectDialogOpen(false);
                setTopicToReject(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
