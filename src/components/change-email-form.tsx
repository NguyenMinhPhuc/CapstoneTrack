

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
import { useAuth, useUser, useFirestore } from '@/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail } from 'firebase/auth';
import type { User } from 'firebase/auth';
import type { SystemUser } from '@/lib/types';
import { writeBatch, doc } from 'firebase/firestore';

const formSchema = z.object({
    newEmail: z.string().email({ message: 'Email mới không hợp lệ.' }),
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại.'),
}).refine(data => data.newEmail, {
    message: 'Email mới không được để trống.',
    path: ['newEmail'],
});

interface ChangeEmailFormProps {
    user: User;
    userData: SystemUser;
}

export function ChangeEmailForm({ user, userData }: ChangeEmailFormProps) {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newEmail: '',
      currentPassword: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !user.email) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tìm thấy thông tin người dùng.' });
      return;
    }
    
    if (user.email === values.newEmail) {
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Email mới không được trùng với email hiện tại.' });
        return;
    }

    try {
        // 1. Re-authenticate user to ensure they are the legitimate user.
        const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        // 2. Send a verification email to the new address.
        await verifyBeforeUpdateEmail(user, values.newEmail);

        // NOTE: The email in Firestore ('users', 'students', 'supervisors' collections)
        // is NOT updated here. It should be updated only AFTER the user has verified
        // the new email by clicking the link. This typically requires a backend process
        // (like a Cloud Function trigger) or a dedicated page the user lands on after
        // clicking the verification link to complete the update in Firestore.
        // For this client-side form, we only handle the auth part.

        toast({
            title: 'Yêu cầu đã được gửi',
            description: `Một email xác thực đã được gửi đến ${values.newEmail}. Vui lòng kiểm tra hộp thư và làm theo hướng dẫn để hoàn tất việc thay đổi email.`,
            duration: 9000,
        });
        form.reset();

    } catch (error: any) {
        let description = 'Đã xảy ra lỗi. Vui lòng thử lại.';
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            description = 'Mật khẩu hiện tại không chính xác.';
        } else if (error.code === 'auth/too-many-requests') {
            description = 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.';
        } else if (error.code === 'auth/email-already-in-use') {
            description = 'Email mới đã được tài khoản khác sử dụng.';
        }
        
        console.error("Error changing email:", error);
        toast({
            variant: 'destructive',
            title: 'Đổi Email thất bại',
            description: description,
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="newEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email mới</FormLabel>
              <FormControl>
                <Input type="email" placeholder="new.email@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu hiện tại</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đổi Email'}
        </Button>
      </form>
    </Form>
  );
}
