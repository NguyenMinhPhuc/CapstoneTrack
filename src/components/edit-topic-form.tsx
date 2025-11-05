
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import type { GraduationDefenseSession, ProjectTopic } from '@/lib/types';
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import React from 'react';
import { MarkdownToolbar } from './markdown-toolbar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const formSchema = z.object({
  sessionId: z.string({ required_error: 'Vui lòng chọn một đợt báo cáo.' }),
  title: z.string().min(10, { message: 'Tên đề tài phải có ít nhất 10 ký tự.' }),
  field: z.string().optional(),
  summary: z.string().min(10, { message: 'Tóm tắt phải có ít nhất 10 ký tự.' }),
  objectives: z.string().optional(),
  expectedResults: z.string().optional(),
  maxStudents: z.enum(['1', '2'], { required_error: 'Vui lòng chọn số lượng sinh viên.' }),
});

interface EditTopicFormProps {
  topic: ProjectTopic;
  sessions: GraduationDefenseSession[];
  onFinished: () => void;
}

export function EditTopicForm({ topic, sessions, onFinished }: EditTopicFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const summaryRef = React.useRef<HTMLTextAreaElement>(null);
  const objectivesRef = React.useRef<HTMLTextAreaElement>(null);
  const expectedResultsRef = React.useRef<HTMLTextAreaElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sessionId: topic.sessionId,
      title: topic.title,
      field: topic.field || '',
      summary: topic.summary,
      objectives: topic.objectives || '',
      expectedResults: topic.expectedResults || '',
      maxStudents: String(topic.maxStudents) as '1' | '2',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const topicRef = doc(firestore, 'projectTopics', topic.id);
    const updatedData: Partial<ProjectTopic> = {
        ...values,
        maxStudents: parseInt(values.maxStudents, 10) as 1 | 2,
        status: 'pending' // Reset status to pending on edit
    };

    try {
      await updateDoc(topicRef, updatedData);
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật thông tin đề tài và gửi lại để chờ duyệt.',
      });
      onFinished();
    } catch (error: any) {
      console.error("Error updating topic:", error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Không thể cập nhật đề tài: ${error.message}`,
      });
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Chỉnh sửa Đề tài</DialogTitle>
        <DialogDescription>
          Cập nhật thông tin chi tiết cho đề tài của bạn. Thay đổi sẽ cần được duyệt lại.
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn một đợt báo cáo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sessions.map(session => (
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
                      <Input {...field} />
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
                      <Input placeholder="Ví dụ: Trí tuệ nhân tạo, Xử lý ngôn ngữ tự nhiên" {...field} />
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
                    <MarkdownToolbar textareaRef={summaryRef} onChange={field.onChange} />
                    <FormControl>
                      <Textarea ref={summaryRef} className="resize-y rounded-t-none" {...field} />
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
                    <MarkdownToolbar textareaRef={objectivesRef} onChange={field.onChange} />
                    <FormControl>
                      <Textarea ref={objectivesRef} className="resize-y rounded-t-none" {...field} />
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
                    <MarkdownToolbar textareaRef={expectedResultsRef} onChange={field.onChange} />
                    <FormControl>
                      <Textarea ref={expectedResultsRef} className="resize-y rounded-t-none" {...field} />
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
                          <FormLabel className="font-normal">1 Sinh viên</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="2" />
                          </FormControl>
                          <FormLabel className="font-normal">2 Sinh viên</FormLabel>
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
            <Button type="button" variant="outline" onClick={onFinished}>Hủy</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Đang lưu..." : "Lưu và gửi duyệt lại"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
