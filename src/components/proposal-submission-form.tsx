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
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { DefenseRegistration } from '@/lib/types';
import React from 'react';
import { MarkdownToolbar } from './markdown-toolbar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const formSchema = z.object({
  projectTitle: z.string().min(1, { message: 'Tên đề tài là bắt buộc.' }),
  summary: z.string().min(10, { message: 'Tóm tắt cần có ít nhất 10 ký tự.' }),
  objectives: z.string().min(10, { message: 'Mục tiêu cần có ít nhất 10 ký tự.' }),
  implementationPlan: z.string().min(10, { message: 'Kế hoạch thực hiện cần có ít nhất 10 ký tự.' }),
  expectedResults: z.string().min(10, { message: 'Kết quả mong đợi cần có ít nhất 10 ký tự.' }),
  proposalLink: z.string().url({ message: 'Vui lòng nhập một URL hợp lệ.' }).optional().or(z.literal('')),
});

interface ProposalSubmissionFormProps {
  registration: DefenseRegistration;
  allowEditingApproved: boolean;
}

export function ProposalSubmissionForm({ registration, allowEditingApproved }: ProposalSubmissionFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const summaryRef = React.useRef<HTMLTextAreaElement>(null);
  const objectivesRef = React.useRef<HTMLTextAreaElement>(null);
  const implementationPlanRef = React.useRef<HTMLTextAreaElement>(null);
  const expectedResultsRef = React.useRef<HTMLTextAreaElement>(null);

  const isApproved = registration.proposalStatus === 'approved';
  const isFormDisabled = isApproved && !allowEditingApproved;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectTitle: registration.projectTitle || '',
      summary: registration.summary || '',
      objectives: registration.objectives || '',
      implementationPlan: registration.implementationPlan || '',
      expectedResults: registration.expectedResults || '',
      proposalLink: registration.proposalLink || '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const registrationDocRef = doc(firestore, 'defenseRegistrations', registration.id);

    const dataToUpdate = {
      ...values,
      proposalStatus: 'pending_approval' as const,
    };

    updateDoc(registrationDocRef, dataToUpdate)
        .then(() => {
            toast({
                title: 'Nộp thành công',
                description: 'Thuyết minh của bạn đã được gửi để chờ giáo viên duyệt.',
            });
        })
        .catch(error => {
            const contextualError = new FirestorePermissionError({
                path: registrationDocRef.path,
                operation: 'update',
                requestResourceData: dataToUpdate,
            });
            errorEmitter.emit('permission-error', contextualError);
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Không thể nộp thuyết minh.',
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
              <MarkdownToolbar textareaRef={summaryRef} />
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
              <MarkdownToolbar textareaRef={objectivesRef} />
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
          name="implementationPlan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phương pháp và Công nghệ thực hiện</FormLabel>
              <MarkdownToolbar textareaRef={implementationPlanRef} />
              <FormControl>
                <Textarea
                  ref={implementationPlanRef}
                  placeholder="Mô tả các phương pháp, công nghệ, framework sẽ sử dụng..."
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
              <MarkdownToolbar textareaRef={expectedResultsRef} />
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
          name="proposalLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link file thuyết minh toàn văn (tùy chọn)</FormLabel>
              <FormControl>
                <Input placeholder="https://docs.google.com/document/d/..." {...field} disabled={isFormDisabled}/>
              </FormControl>
               <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || isFormDisabled}>
          {isFormDisabled ? 'Thuyết minh đã được duyệt' : (form.formState.isSubmitting ? 'Đang nộp...' : 'Nộp Thuyết minh')}
        </Button>
      </form>
    </Form>
  );
}
