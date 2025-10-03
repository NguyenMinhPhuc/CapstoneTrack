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
import { useAuth, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp } from 'firebase/firestore';

const formSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ.' }),
  password: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự.' }),
  role: z.enum(['student', 'supervisor', 'admin'], {
    required_error: 'Bạn phải chọn một vai trò.',
  }),
});

interface AddUserFormProps {
    onFinished: () => void;
}

export function AddUserForm({ onFinished }: AddUserFormProps) {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // NOTE: This creates a temporary second auth instance to create the user.
      // This is a workaround because the primary auth instance is tied to the logged-in admin.
      const tempAuth = auth.app.name === 'temp' ? auth : { ...auth, app: { ...auth.app, name: 'temp' } };
      
      const userCredential = await createUserWithEmailAndPassword(
        tempAuth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      const userDocRef = doc(firestore, 'users', user.uid);
      setDocumentNonBlocking(userDocRef, {
        email: values.email,
        role: values.role,
        createdAt: serverTimestamp(),
      }, {});

      // Optionally create student/supervisor docs
      if (values.role === 'student' || values.role === 'supervisor') {
        const collectionName = values.role === 'student' ? 'students' : 'supervisors';
        const newDocRef = doc(firestore, collectionName, user.uid);
        setDocumentNonBlocking(newDocRef, {
            email: values.email,
            userId: user.uid,
            createdAt: serverTimestamp(),
        }, {});
      }

      toast({
        title: 'Thành công',
        description: `Tài khoản cho ${values.email} đã được tạo.`,
      });
      onFinished();
    } catch (error: any) {
      console.error("Error creating user:", error);
      let description = 'Không thể tạo tài khoản. Vui lòng thử lại.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'Email này đã được sử dụng.';
      } else {
        description = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Ôi! Đã xảy ra lỗi.',
        description: description,
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" {...field} />
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
            {form.formState.isSubmitting ? "Đang tạo..." : "Tạo tài khoản"}
        </Button>
      </form>
    </Form>
  );
}
