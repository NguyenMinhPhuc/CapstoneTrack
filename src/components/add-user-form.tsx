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
import { useFirestore, setDocumentNonBlocking } from '@/firebase';
import { getAuth, createUserWithEmailAndPassword, Auth } from 'firebase/auth';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
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

// Helper to get a secondary app instance
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
      const userCredential = await createUserWithEmailAndPassword(
        tempAuth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      // Always create a document in the 'users' collection
      const userDocRef = doc(firestore, 'users', user.uid);
      setDocumentNonBlocking(userDocRef, {
        email: values.email,
        role: values.role,
        createdAt: serverTimestamp(),
      }, {});

      // Optionally create a corresponding document in 'students' or 'supervisors' collection
      if (values.role === 'student') {
        const studentDocRef = doc(firestore, 'students', user.uid);
        setDocumentNonBlocking(studentDocRef, {
            email: values.email,
            userId: user.uid,
            // Add other student-specific fields here if necessary
            createdAt: serverTimestamp(),
        }, {});
      } else if (values.role === 'supervisor') {
        const supervisorDocRef = doc(firestore, 'supervisors', user.uid);
        setDocumentNonBlocking(supervisorDocRef, {
            email: values.email,
            userId: user.uid,
            // Add other supervisor-specific fields here if necessary
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
    } finally {
        // Clean up the secondary app instance to avoid memory leaks
        try {
            await deleteApp(secondaryApp);
        } catch (e) {
            console.error("Error deleting secondary app:", e);
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
