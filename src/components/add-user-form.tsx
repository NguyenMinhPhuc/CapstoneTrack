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
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

// IMPORTANT: To prevent "auth/network-request-failed" errors, ensure that the
// domain your application is running on (e.g., localhost) is added to the
// list of authorized domains in the Firebase console under:
// Authentication > Settings > Authorized domains.

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

// Helper to get a secondary app instance for user creation
const getSecondaryApp = () => {
  const secondaryAppName = 'secondary-app-for-user-creation';
  const existingApp = getApps().find(app => app.name === secondaryAppName);
  if (existingApp) {
    return existingApp;
  }
  return initializeApp(firebaseConfig, secondaryAppName);
};


export function AddUserForm({ onFinished }: AddUserFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const secondaryApp = getSecondaryApp();
    const tempAuth = getAuth(secondaryApp);
    try {
      // 1. Create user in Firebase Authentication using a temporary auth instance
      const userCredential = await createUserWithEmailAndPassword(
        tempAuth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      // 2. ALWAYS create a document in the 'users' collection for management
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        email: values.email,
        role: values.role,
        status: 'active', // Default status for new users
        createdAt: serverTimestamp(),
      });

      // 3. Optionally, create a profile in the role-specific collection
      if (values.role === 'student') {
        const studentDocRef = doc(firestore, 'students', user.uid);
        await setDoc(studentDocRef, {
            email: values.email,
            userId: user.uid,
            createdAt: serverTimestamp(),
        });
      } else if (values.role === 'supervisor') {
        const supervisorDocRef = doc(firestore, 'supervisors', user.uid);
        await setDoc(supervisorDocRef, {
            email: values.email,
            userId: user.uid,
            createdAt: serverTimestamp(),
        });
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
      } else if (error.code === 'auth/network-request-failed') {
          description = 'Lỗi mạng hoặc tên miền chưa được cấp phép. Vui lòng kiểm tra kết nối và cấu hình tên miền trong Firebase console.';
      } else {
        description = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Ôi! Đã xảy ra lỗi.',
        description: description,
      });
    } finally {
        if (tempAuth.currentUser) {
            await signOut(tempAuth);
        }
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
