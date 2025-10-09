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
import { useAuth, useUser } from '@/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

const formSchema = z.object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại.'),
    newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự.'),
    confirmPassword: z.string().min(6, 'Vui lòng xác nhận mật khẩu mới.'),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu mới và mật khẩu xác nhận không khớp.',
    path: ['confirmPassword'],
});

export function ChangePasswordForm() {
  const { toast } = useToast();
  const auth = useAuth();
  const { user } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !user.email) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không tìm thấy thông tin người dùng.',
      });
      return;
    }

    try {
        // 1. Re-authenticate user
        const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        // 2. If successful, update the password
        await updatePassword(user, values.newPassword);

        toast({
            title: 'Thành công',
            description: 'Mật khẩu của bạn đã được thay đổi.',
        });
        form.reset();

    } catch (error: any) {
        let description = 'Đã xảy ra lỗi. Vui lòng thử lại.';
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            description = 'Mật khẩu hiện tại không chính xác.';
        } else if (error.code === 'auth/too-many-requests') {
            description = 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.';
        }
        
        console.error("Error changing password:", error);
        toast({
            variant: 'destructive',
            title: 'Đổi mật khẩu thất bại',
            description: description,
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu hiện tại</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu mới</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Xác nhận mật khẩu mới</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
        </Button>
      </form>
    </Form>
  );
}
