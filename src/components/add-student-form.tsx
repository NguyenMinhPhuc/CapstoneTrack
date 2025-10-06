
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
import { doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';

const formSchema = z.object({
  firstName: z.string().min(1, { message: 'Họ là bắt buộc.' }),
  lastName: z.string().min(1, { message: 'Tên là bắt buộc.' }),
  studentId: z.string().min(1, { message: 'MSSV là bắt buộc.' }),
  email: z.string().email({ message: 'Email không hợp lệ.' }),
  major: z.string().optional(),
  enrollmentYear: z.coerce.number().optional(),
});

interface AddStudentFormProps {
  onFinished: () => void;
}

const getSecondaryApp = () => {
  const secondaryAppName = 'secondary-app-for-student-creation';
  const existingApp = getApps().find(app => app.name === secondaryAppName);
  return existingApp || initializeApp(firebaseConfig, secondaryAppName);
};

export function AddStudentForm({ onFinished }: AddStudentFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      studentId: '',
      email: '',
      major: '',
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
        role: 'student',
        status: 'active',
        createdAt: serverTimestamp(),
      });

      // 3. Create 'students' collection document
      const studentDocRef = doc(firestore, 'students', user.uid);
      batch.set(studentDocRef, {
        ...values,
        id: user.uid,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      
      // Commit the batch
      await batch.commit();

      toast({
        title: 'Thành công',
        description: `Sinh viên ${values.firstName} ${values.lastName} đã được tạo. Mật khẩu tạm thời: ${password}`,
        duration: 9000, // Make toast last longer to show password
      });
      onFinished();
    } catch (error: any) {
      console.error("Error creating student:", error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.code === 'auth/email-already-in-use' ? 'Email này đã được sử dụng.' : `Không thể tạo sinh viên: ${error.message}`,
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
            name="studentId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Mã số sinh viên</FormLabel>
                <FormControl>
                    <Input placeholder="122001xxx" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
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
            name="major"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Chuyên ngành</FormLabel>
                <FormControl>
                    <Input placeholder="Công nghệ thông tin" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
         <FormField
            control={form.control}
            name="enrollmentYear"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Năm nhập học</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="2022" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Đang tạo..." : "Tạo Sinh viên"}
        </Button>
      </form>
    </Form>
  );
}
