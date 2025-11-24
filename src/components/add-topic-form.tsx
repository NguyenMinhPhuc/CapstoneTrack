"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import type { GraduationDefenseSession, ProjectTopic } from "@/lib/types";
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { MarkdownToolbar } from "./markdown-toolbar";
import React from "react";

const formSchema = z.object({
  sessionId: z.string({ required_error: "Vui lòng chọn một đợt báo cáo." }),
  title: z
    .string()
    .min(10, { message: "Tên đề tài phải có ít nhất 10 ký tự." }),
  field: z.string().optional(),
  summary: z.string().min(10, { message: "Tóm tắt phải có ít nhất 10 ký tự." }),
  objectives: z.string().optional(),
  expectedResults: z.string().optional(),
  maxStudents: z.enum(["1", "2"], {
    required_error: "Vui lòng chọn số lượng sinh viên.",
  }),
});

interface AddTopicFormProps {
  supervisorId: string;
  supervisorName: string;
  sessions: GraduationDefenseSession[];
  onFinished: () => void;
}

export function AddTopicForm({
  supervisorId,
  supervisorName,
  sessions,
  onFinished,
}: AddTopicFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const summaryRef = React.useRef<HTMLTextAreaElement>(null);
  const objectivesRef = React.useRef<HTMLTextAreaElement>(null);
  const expectedResultsRef = React.useRef<HTMLTextAreaElement>(null);

  // Toolbar handler will be attached inline in each field now.

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      field: "",
      summary: "",
      objectives: "",
      expectedResults: "",
      maxStudents: "1",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const newTopicData: Omit<ProjectTopic, "id"> = {
      ...values,
      supervisorId,
      supervisorName,
      maxStudents: parseInt(values.maxStudents, 10) as 1 | 2,
      status: "pending" as const, // Set default status to pending for approval
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(firestore, "projectTopics"), newTopicData);
      toast({
        title: "Thành công",
        description: `Đã gửi đề tài "${values.title}" để chờ duyệt.`,
      });
      onFinished();
    } catch (error: any) {
      console.error("Error creating topic:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: `Không thể tạo đề tài: ${error.message}`,
      });
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Thêm Đề tài mới</DialogTitle>
        <DialogDescription>
          Điền thông tin chi tiết để đề xuất một đề tài mới cho sinh viên. Đề
          tài sẽ cần được admin duyệt trước khi hiển thị.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <ScrollArea className="h-[65vh] pr-6">
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="sessionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Đợt báo cáo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn một đợt báo cáo để gán đề tài" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sessions
                          .filter(
                            (s) =>
                              s.status === "upcoming" || s.status === "ongoing"
                          )
                          .map((session) => (
                            <SelectItem key={session.id} value={session.id}>
                              {session.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên đề tài</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ví dụ: Xây dựng ứng dụng nhận diện cảm xúc qua giọng nói"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="field"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lĩnh vực</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ví dụ: Trí tuệ nhân tạo, Xử lý ngôn ngữ tự nhiên"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả tóm tắt</FormLabel>
                    <MarkdownToolbar
                      textareaRef={summaryRef}
                      onChange={(newValue) => {
                        field.onChange(newValue);
                        form.setValue("summary", newValue, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    />
                    <FormControl>
                      <Textarea
                        ref={(el) => {
                          summaryRef.current = el;
                          field.ref(el);
                        }}
                        placeholder="Mô tả ngắn gọn về bối cảnh, vấn đề và hướng giải quyết của đề tài."
                        className="resize-y rounded-t-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="objectives"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mục tiêu của đề tài (tùy chọn)</FormLabel>
                    <MarkdownToolbar
                      textareaRef={objectivesRef}
                      onChange={(newValue) => {
                        field.onChange(newValue);
                        form.setValue("objectives", newValue, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    />
                    <FormControl>
                      <Textarea
                        ref={(el) => {
                          objectivesRef.current = el;
                          field.ref(el);
                        }}
                        placeholder="Liệt kê các mục tiêu cụ thể, ví dụ: &#10;- Nghiên cứu... &#10;- Xây dựng mô hình... &#10;- Triển khai ứng dụng..."
                        className="resize-y rounded-t-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expectedResults"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kết quả mong đợi (tùy chọn)</FormLabel>
                    <MarkdownToolbar
                      textareaRef={expectedResultsRef}
                      onChange={(newValue) => {
                        field.onChange(newValue);
                        form.setValue("expectedResults", newValue, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    />
                    <FormControl>
                      <Textarea
                        ref={(el) => {
                          expectedResultsRef.current = el;
                          field.ref(el);
                        }}
                        placeholder="Liệt kê các sản phẩm, kết quả cụ thể, ví dụ: &#10;- Báo cáo toàn văn &#10;- Source code ứng dụng &#10;- Bộ dữ liệu đã xử lý..."
                        className="resize-y rounded-t-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxStudents"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Số lượng sinh viên tối đa</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="1" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            1 Sinh viên
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="2" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            2 Sinh viên
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={onFinished}>
              Hủy
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Đang gửi..." : "Gửi duyệt"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
