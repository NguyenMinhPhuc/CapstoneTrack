
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
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { Supervisor } from '@/lib/types';

const formSchema = z.object({
  firstName: z.string().min(1, { message: 'Họ là bắt buộc.' }),
  lastName: z.string().min(1, { message: 'Tên là bắt buộc.' }),
  email: z.string().email({ message: 'Email không hợp lệ.' }).readonly(), // Email is linked to auth, should not be changed here.
  department: z.string().min(1, { message: 'Khoa/Bộ môn là bắt buộc.' }),
  facultyRank: z.string().optional(),
});

interface EditSupervisorFormProps {
  supervisor: Supervisor;
  onFinished: () => void;
}

export function EditSupervisorForm({ supervisor, onFinished }: EditSupervisorFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: supervisor.firstName || '',
      lastName: supervisor.lastName || '',
      email: supervisor.email || '',
      department: supervisor.department || '',
      facultyRank: supervisor.facultyRank || '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const supervisorDocRef = doc(firestore, 'supervisors', supervisor.id);
    
    try {
      // We don't update email here as it's tied to auth.
      const { email, ...updateData } = values;

      await updateDoc(supervisorDocRef, updateData);
      
      toast({
        title: 'Thành công',
        description: 'Thông tin giáo viên đã được cập nhật.',
      });
      onFinished();
    } catch (error: any) {
      console.error("Error updating supervisor:", error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Không thể cập nhật thông tin: ${error.message}`,
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Họ</FormLabel>
                <FormControl>
                    <Input placeholder="Nguyễn Văn" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Tên</FormLabel>
                <FormControl>
                    <Input placeholder="An" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} disabled />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Khoa / Bộ môn</FormLabel>
                <FormControl>
                    <Input placeholder="Công nghệ thông tin" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
         <FormField
            control={form.control}
            name="facultyRank"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Chức vụ (tùy chọn)</FormLabel>
                <FormControl>
                    <Input placeholder="Trưởng khoa" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </form>
    </Form>
  );
}
