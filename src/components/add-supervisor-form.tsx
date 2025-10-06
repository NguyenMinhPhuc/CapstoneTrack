
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
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
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';

const formSchema = z.object({
  firstName: z.string().min(1, { message: 'Họ là bắt buộc.' }),
  lastName: z.string().min(1, { message: 'Tên là bắt buộc.' }),
  email: z.string().email({ message: 'Email không hợp lệ.' }),
  department: z.string().min(1, { message: 'Khoa/Bộ môn là bắt buộc.' }),
  facultyRank: z.string().optional(),
});

interface AddSupervisorFormProps {
  onFinished: () => void;
}

const getSecondaryApp = () => {
  const secondaryAppName = 'secondary-app-for-supervisor-creation';
  const existingApp = getApps().find(app => app.name === secondaryAppName);
  return existingApp || initializeApp(firebaseConfig, secondaryAppName);
};

export function AddSupervisorForm({ onFinished }: AddSupervisorFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      department: '',
      facultyRank: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const secondaryApp = getSecondaryApp();
    const tempAuth = getAuth(secondaryApp);
    const password = uuidv4().substring(0, 8); // Generate a random password

    try {
      // 1. Create Auth user
      const userCredential = await createUserWithEmailAndPassword(tempAuth, values.email, password);
      const user = userCredential.user;

      const batch = writeBatch(firestore);

      // 2. Create 'users' collection document
      const userDocRef = doc(firestore, 'users', user.uid);
      batch.set(userDocRef, {
        email: values.email,
        role: 'supervisor',
        status: 'active',
        createdAt: serverTimestamp(),
      });

      // 3. Create 'supervisors' collection document
      const supervisorDocRef = doc(firestore, 'supervisors', user.uid);
      batch.set(supervisorDocRef, {
        ...values,
        id: user.uid,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      
      await batch.commit();

      toast({
        title: 'Thành công',
        description: `Giáo viên ${values.firstName} ${values.lastName} đã được tạo. Mật khẩu tạm thời: ${password}`,
        duration: 9000,
      });
      onFinished();
    } catch (error: any) {
      console.error("Error creating supervisor:", error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.code === 'auth/email-already-in-use' ? 'Email này đã được sử dụng.' : `Không thể tạo giáo viên: ${error.message}`,
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
                <Input placeholder="email@example.com" {...field} />
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
            {form.formState.isSubmitting ? "Đang tạo..." : "Tạo Giáo viên"}
        </Button>
      </form>
    </Form>
  );
}
