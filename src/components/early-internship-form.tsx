"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  useFirestore,
  errorEmitter,
  FirestorePermissionError,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import type { Student, InternshipCompany, Supervisor } from "@/lib/types";
import type { User } from "firebase/auth";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  User as UserIcon,
  Mail,
  Phone,
  Building,
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { Calendar } from "./ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Separator } from "./ui/separator";
import { SupervisorCombobox } from "./supervisor-combobox";

const formSchema = z.object({
  companyId: z.string().min(1, { message: "Vui lòng chọn một phòng ban." }),
  positionId: z.string().optional(),
  supervisorId: z
    .string()
    .min(1, { message: "Vui lòng chọn người hướng dẫn." }),
  startDate: z.date({ required_error: "Ngày bắt đầu là bắt buộc." }),
  endDate: z.date().optional(),
  proofLink: z
    .string()
    .url({ message: "URL không hợp lệ" })
    .optional()
    .or(z.literal("")),
});

interface EarlyInternshipFormProps {
  user: User;
  student: Student;
  onFinished: () => void;
}

export function EarlyInternshipForm({
  user,
  student,
  onFinished,
}: EarlyInternshipFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [selectedDepartment, setSelectedDepartment] =
    useState<InternshipCompany | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(
    null,
  );

  const lhuDepartmentsQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, "internshipCompanies"),
        where("isLHU", "==", true),
      ),
    [firestore],
  );
  const { data: lhuDepartments, isLoading: isLoadingDepartments } =
    useCollection<InternshipCompany>(lhuDepartmentsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      proofLink: "",
      startDate: new Date(),
      endDate: addMonths(new Date(), 12),
    },
  });

  const companyId = useWatch({ control: form.control, name: "companyId" });
  const startDate = useWatch({ control: form.control, name: "startDate" });

  useEffect(() => {
    if (startDate) {
      form.setValue("endDate", addMonths(startDate, 12));
    }
  }, [startDate, form]);

  useEffect(() => {
    if (companyId && lhuDepartments) {
      const department = lhuDepartments.find((d) => d.id === companyId);
      setSelectedDepartment(department || null);
      // reset selected position when department changes
      setSelectedPositionId(null);
      // prefer position-level supervisor if positions exist
      const defaultSupervisorId =
        department?.positions && department.positions.length > 0
          ? department.positions[0].supervisorId ||
            department.supervisorId ||
            ""
          : department?.supervisorId || "";
      if (defaultSupervisorId) {
        form.setValue("supervisorId", defaultSupervisorId);
      } else {
        form.setValue("supervisorId", "");
      }
    } else {
      setSelectedDepartment(null);
      form.setValue("supervisorId", "");
    }
  }, [companyId, lhuDepartments, form]);

  // normalize escaped markdown sequences like \* \_ etc.
  const normalizeMarkdown = (src: string) => src.replace(/\\([*_`~\\])/g, "$1");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const department = lhuDepartments?.find((d) => d.id === values.companyId);
    if (!department) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không tìm thấy thông tin phòng ban.",
      });
      return;
    }

    if (!values.supervisorId) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Phòng ban này chưa có người hướng dẫn được gán.",
      });
      return;
    }

    const batch = format(values.startDate, "MM/yyyy");

    const newRecord = {
      studentId: user.uid,
      studentName: `${student.firstName} ${student.lastName}`,
      studentIdentifier: student.studentId,
      companyName: department.name,
      companyAddress: department.address || "",
      supervisorId: values.supervisorId,
      supervisorName: department.contactName || "",
      startDate: values.startDate,
      endDate: values.endDate,
      proofLink: values.proofLink,
      status: "pending_admin_approval" as const,
      batch: batch,
      createdAt: serverTimestamp(),
    };

    addDoc(collection(firestore, "earlyInternships"), newRecord)
      .then(() => {
        toast({
          title: "Thành công",
          description: "Đã gửi đơn đăng ký đến quản trị viên để chờ duyệt.",
        });
        onFinished();
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: "earlyInternships",
          operation: "create",
          requestResourceData: newRecord,
        });
        errorEmitter.emit("permission-error", contextualError);
      });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="companyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chọn Phòng ban</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoadingDepartments}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isLoadingDepartments
                          ? "Đang tải..."
                          : "Chọn một phòng ban..."
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lhuDepartments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {selectedDepartment && (
          <Card>
            <CardHeader>
              <CardTitle>{selectedDepartment.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Building className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p>
                  {selectedDepartment.address || "Chưa có thông tin địa chỉ"}
                </p>
              </div>
              <Separator />
              {selectedDepartment.description ? (
                <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                  >
                    {normalizeMarkdown(selectedDepartment.description)}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground">Không có mô tả.</p>
              )}
            </CardContent>
          </Card>
        )}
        <FormField
          control={form.control}
          name="supervisorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Người hướng dẫn tại phòng ban</FormLabel>
              <FormControl>
                <SupervisorCombobox
                  value={field.value || null}
                  onChange={(supervisorId) => {
                    field.onChange(supervisorId || "");
                  }}
                  // enable combobox when a department is selected so students can choose
                  disabled={!selectedDepartment}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* If the department defines positions, let student pick a position which will set the supervisor */}
        {selectedDepartment?.positions &&
          selectedDepartment.positions.length > 0 && (
            <FormField
              control={form.control}
              name="positionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vị trí thực tập</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        setSelectedPositionId(val || null);
                        const pos = selectedDepartment.positions?.find(
                          (p) => p.id === val,
                        );
                        if (pos?.supervisorId) {
                          form.setValue("supervisorId", pos.supervisorId);
                        }
                      }}
                      value={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn vị trí..." />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedDepartment.positions?.map((pos) => (
                          <SelectItem key={pos.id} value={pos.id}>
                            {pos.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Ngày bắt đầu</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Chọn ngày</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Ngày kết thúc (dự kiến)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Chọn ngày</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="proofLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link minh chứng (nếu có)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Link đến giấy tiếp nhận hoặc giấy tờ liên quan"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Đang gửi..." : "Gửi Đơn đăng ký"}
        </Button>
      </form>
    </Form>
  );
}
