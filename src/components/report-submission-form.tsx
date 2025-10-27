
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
import { useFirestore, errorEmitter, FirestorePermissionError, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { DefenseRegistration, SystemSettings } from '@/lib/types';
import React from 'react';
import { MarkdownToolbar } from './markdown-toolbar';

const formSchema = z.object({
  projectTitle: z.string().min(1, { message: 'Tên đề tài là bắt buộc.' }),
  summary: z.string().min(10, { message: 'Tóm tắt cần có ít nhất 10 ký tự.' }),
  objectives: z.string().min(10, { message: 'Mục tiêu cần có ít nhất 10 ký tự.' }),
  expectedResults: z.string().min(10, { message: 'Kết quả mong đợi cần có ít nhất 10 ký tự.' }),
  reportLink: z.string().url({ message: 'Vui lòng nhập một URL hợp lệ.' }).optional().or(z.literal('')),
});

interface ReportSubmissionFormProps {
  registration: DefenseRegistration;
}

export function ReportSubmissionForm({ registration }: ReportSubmissionFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const summaryRef = React.useRef<HTMLTextAreaElement>(null);
  const objectivesRef = React.useRef<HTMLTextAreaElement>(null);
  const expectedResultsRef = React.useRef<HTMLTextAreaElement>(null);

  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'systemSettings', 'features'), [firestore]);
  const { data: settings } = useDoc<SystemSettings>(settingsDocRef);
  const requireApproval = settings?.requireReportApproval ?? true;

  const isFormDisabled = registration.reportStatus === 'approved' || registration.reportStatus === 'pending_approval';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectTitle: registration.projectTitle || '',
      summary: registration.summary || '',
      objectives: registration.objectives || '',
      expectedResults: registration.expectedResults || '',
      reportLink: registration.reportLink || '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const registrationDocRef = doc(firestore, 'defenseRegistrations', registration.id);

    const dataToUpdate = {
        ...values,
        reportStatus: requireApproval ? 'pending_approval' : 'approved',
    }

    updateDoc(registrationDocRef, dataToUpdate)
        .then(() => {
            toast({
                title: 'Thành công',
                description: 'Thông tin báo cáo của bạn đã được cập nhật.',
            });
        })
        .catch(error => {
            const contextualError = new FirestorePermissionError({
                path: registrationDocRef.path,
                operation: 'update',
                requestResourceData: values,
            });
            errorEmitter.emit('permission-error', contextualError);
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Không thể cập nhật thông tin báo cáo.',
            });
        });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="projectTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên đề tài</FormLabel>
              <FormControl>
                <Input placeholder="Ví dụ: Xây dựng hệ thống quản lý đề tài tốt nghiệp..." {...field} disabled={isFormDisabled} />
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
              <FormLabel>Tóm tắt</FormLabel>
              <MarkdownToolbar textareaRef={summaryRef} onChange={field.onChange} />
              <FormControl>
                <Textarea
                  ref={summaryRef}
                  placeholder="Mô tả ngắn gọn về nội dung, bối cảnh và vấn đề mà đề tài giải quyết."
                  className="resize-y min-h-[100px] rounded-t-none"
                  {...field}
                   disabled={isFormDisabled}
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
              <FormLabel>Mục tiêu của đề tài</FormLabel>
              <MarkdownToolbar textareaRef={objectivesRef} onChange={field.onChange} />
              <FormControl>
                <Textarea
                  ref={objectivesRef}
                  placeholder="Liệt kê các mục tiêu cụ thể mà đề tài cần đạt được (ví dụ: gạch đầu dòng)."
                  className="resize-y min-h-[100px] rounded-t-none"
                  {...field}
                   disabled={isFormDisabled}
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
              <FormLabel>Kết quả mong đợi</FormLabel>
              <MarkdownToolbar textareaRef={expectedResultsRef} onChange={field.onChange} />
              <FormControl>
                <Textarea
                  ref={expectedResultsRef}
                  placeholder="Mô tả các sản phẩm hoặc kết quả cụ thể sẽ có sau khi hoàn thành đề tài (ví dụ: ứng dụng web, bài báo khoa học...)."
                  className="resize-y min-h-[100px] rounded-t-none"
                  {...field}
                   disabled={isFormDisabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="reportLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link file báo cáo toàn văn</FormLabel>
              <FormControl>
                <Input placeholder="https://docs.google.com/document/d/..." {...field} disabled={isFormDisabled} />
              </FormControl>
               <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || isFormDisabled}>
          {isFormDisabled ? 'Báo cáo đã được nộp hoặc duyệt' : (form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi')}
        </Button>
      </form>
    </Form>
  );
}
