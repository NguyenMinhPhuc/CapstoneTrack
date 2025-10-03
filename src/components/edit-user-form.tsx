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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { SystemUser } from '@/lib/types';

const formSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ.' }),
  role: z.enum(['student', 'supervisor', 'admin'], {
    required_error: 'Bạn phải chọn một vai trò.',
  }),
});

interface EditUserFormProps {
  user: SystemUser;
  onFinished: () => void;
}

export function EditUserForm({ user, onFinished }: EditUserFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: user.email,
      role: user.role,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const userDocRef = doc(firestore, 'users', user.id);
    const updates: Partial<SystemUser> = {};

    if (values.email !== user.email) {
      updates.email = values.email;
    }
    if (values.role !== user.role) {
      updates.role = values.role;
    }

    if (Object.keys(updates).length === 0) {
      toast({
        description: 'Không có thông tin nào thay đổi.',
      });
      onFinished();
      return;
    }

    try {
      await updateDoc(userDocRef, updates);

      // If role changes, we might need to update other collections.
      // This logic can be expanded later.
      if (updates.role) {
          const studentDocRef = doc(firestore, 'students', user.id);
          const supervisorDocRef = doc(firestore, 'supervisors', user.id);
          if(updates.role === 'student' && user.role !== 'student') {
             await updateDoc(studentDocRef, { email: values.email });
          } else if (updates.role === 'supervisor' && user.role !== 'supervisor') {
             await updateDoc(supervisorDocRef, { email: values.email });
          }
      }

      toast({
        title: 'Thành công',
        description: `Thông tin người dùng ${user.email} đã được cập nhật.`,
      });
      onFinished();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        variant: 'destructive',
        title: 'Ôi! Đã xảy ra lỗi.',
        description: error.message || 'Không thể cập nhật thông tin người dùng.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vai trò</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn một vai trò" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="student">Sinh viên</SelectItem>
                  <SelectItem value="supervisor">Giáo viên hướng dẫn</SelectItem>
                  <SelectItem value="admin">Quản trị viên</SelectItem>
                </SelectContent>
              </Select>
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
