'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { useAuth, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  firstName: z.string().min(1, { message: 'Họ là bắt buộc.' }),
  lastName: z.string().min(1, { message: 'Tên là bắt buộc.' }),
  email: z.string().email({ message: 'Email không hợp lệ.' }),
  password: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự.' }),
  role: z.enum(['student', 'supervisor'], {
    required_error: 'Bạn phải chọn một vai trò.',
  }),
});

export function SignUpForm() {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      // 1. ALWAYS create a document in the 'users' collection for management
      const userDocRef = doc(firestore, 'users', user.uid);
      setDocumentNonBlocking(userDocRef, {
        email: values.email,
        role: values.role,
        createdAt: serverTimestamp(),
      }, { merge: true });

      // 2. Optionally, create a profile in the role-specific collection
      if (values.role === 'student') {
        const studentDocRef = doc(firestore, 'students', user.uid);
        setDocumentNonBlocking(studentDocRef, {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          userId: user.uid,
          createdAt: serverTimestamp(),
        }, { merge: true });
      } else if (values.role === 'supervisor') {
        const supervisorDocRef = doc(firestore, 'supervisors', user.uid);
        setDocumentNonBlocking(supervisorDocRef, {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            userId: user.uid,
            createdAt: serverTimestamp(),
        }, { merge: true });
      }

      toast({
        title: 'Thành công',
        description: 'Tài khoản của bạn đã được tạo.',
      });
      router.push('/');
    } catch (error: any) {
      console.error(error);
      let description = 'Không thể tạo tài khoản. Vui lòng thử lại.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'Email này đã được sử dụng. Vui lòng chọn một email khác.'
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
    <Card>
      <CardHeader>
        <CardTitle>Tạo tài khoản</CardTitle>
        <CardDescription>
          Nhập thông tin của bạn để bắt đầu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Họ</FormLabel>
                    <FormControl>
                        <Input placeholder="Nguyễn" {...field} />
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
                        <Input placeholder="Văn A" {...field} />
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
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Bạn sẽ không thể thay đổi vai trò này sau này.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Tạo tài khoản
            </Button>
          </form>
        </Form>
         <div className="mt-4 text-center text-sm">
          Đã có tài khoản?{' '}
          <Link href="/login" className="underline">
            Đăng nhập
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
