
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { DefenseRegistration } from '@/lib/types';
import { Separator } from './ui/separator';

const formSchema = z.object({
  // Internship Company Info
  internship_companyName: z.string().min(1, 'Tên đơn vị thực tập là bắt buộc.'),
  internship_companyAddress: z.string().optional(),
  internship_companySupervisorName: z.string().optional(),
  internship_companySupervisorPhone: z.string().optional(),
  // Internship Document Links
  internship_registrationFormLink: z.string().url({ message: 'Vui lòng nhập một URL hợp lệ.' }).optional().or(z.literal('')),
  internship_commitmentFormLink: z.string().url({ message: 'Vui lòng nhập một URL hợp lệ.' }).optional().or(z.literal('')),
  internship_acceptanceLetterLink: z.string().url({ message: 'Vui lòng nhập một URL hợp lệ.' }).optional().or(z.literal('')),
  internship_feedbackFormLink: z.string().url({ message: 'Vui lòng nhập một URL hợp lệ.' }).optional().or(z.literal('')),
  internship_reportLink: z.string().url({ message: 'Vui lòng nhập một URL hợp lệ.' }).optional().or(z.literal('')),
});

interface InternshipSubmissionFormProps {
  registration: DefenseRegistration;
}

export function InternshipSubmissionForm({ registration }: InternshipSubmissionFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      internship_companyName: registration.internship_companyName || '',
      internship_companyAddress: registration.internship_companyAddress || '',
      internship_companySupervisorName: registration.internship_companySupervisorName || '',
      internship_companySupervisorPhone: registration.internship_companySupervisorPhone || '',
      internship_registrationFormLink: registration.internship_registrationFormLink || '',
      internship_commitmentFormLink: registration.internship_commitmentFormLink || '',
      internship_acceptanceLetterLink: registration.internship_acceptanceLetterLink || '',
      internship_feedbackFormLink: registration.internship_feedbackFormLink || '',
      internship_reportLink: registration.internship_reportLink || '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const registrationDocRef = doc(firestore, 'defenseRegistrations', registration.id);

    updateDoc(registrationDocRef, values)
        .then(() => {
            toast({
                title: 'Thành công',
                description: 'Thông tin hồ sơ thực tập của bạn đã được cập nhật.',
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
                description: 'Không thể cập nhật thông tin hồ sơ thực tập.',
            });
        });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
            <h3 className="text-lg font-medium">Thông tin Đơn vị Thực tập</h3>
            <p className="text-sm text-muted-foreground">Cung cấp chi tiết về nơi bạn đang thực tập.</p>
        </div>
        <Separator />
        
        <FormField
          control={form.control}
          name="internship_companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên đơn vị thực tập</FormLabel>
              <FormControl>
                <Input placeholder="Ví dụ: Công ty TNHH ABC" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="internship_companyAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Địa chỉ đơn vị</FormLabel>
              <FormControl>
                <Input placeholder="Ví dụ: 123 Đường XYZ, Phường A, Quận B, TP.HCM" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="internship_companySupervisorName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Người hướng dẫn tại đơn vị</FormLabel>
                <FormControl>
                    <Input placeholder="Ví dụ: Nguyễn Văn B" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="internship_companySupervisorPhone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>SĐT người hướng dẫn</FormLabel>
                <FormControl>
                    <Input placeholder="Ví dụ: 09xxxxxxxx" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="pt-4">
            <h3 className="text-lg font-medium">Link các Tài liệu</h3>
            <p className="text-sm text-muted-foreground">Dán link đến các tài liệu đã được lưu trữ trên Google Drive hoặc dịch vụ tương tự.</p>
        </div>
        <Separator />

        <FormField
          control={form.control}
          name="internship_registrationFormLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Đơn đăng kí thực tập</FormLabel>
              <FormControl>
                <Input placeholder="https://docs.google.com/..." {...field} />
              </FormControl>
               <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="internship_commitmentFormLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Đơn cam kết tự đi thực tập (nếu có)</FormLabel>
              <FormControl>
                <Input placeholder="https://docs.google.com/..." {...field} />
              </FormControl>
               <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="internship_acceptanceLetterLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Giấy tiếp nhận thực tập</FormLabel>
              <FormControl>
                <Input placeholder="https://docs.google.com/..." {...field} />
              </FormControl>
               <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="internship_feedbackFormLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Giấy nhận xét từ đơn vị thực tập</FormLabel>
              <FormControl>
                <Input placeholder="https://docs.google.com/..." {...field} />
              </FormControl>
               <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="internship_reportLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>File báo cáo thực tập toàn văn</FormLabel>
              <FormControl>
                <Input placeholder="https://docs.google.com/..." {...field} />
              </FormControl>
               <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </form>
    </Form>
  );
}

    