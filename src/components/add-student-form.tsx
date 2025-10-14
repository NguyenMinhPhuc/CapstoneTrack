
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
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Student } from '@/lib/types';

const formSchema = z.object({
  firstName: z.string().min(1, { message: 'Họ là bắt buộc.' }),
  lastName: z.string().min(1, { message: 'Tên là bắt buộc.' }),
  studentId: z.string().min(1, { message: 'MSSV là bắt buộc.' }),
  email: z.string().email({ message: 'Email không hợp lệ.' }),
  major: z.string().optional(),
  enrollmentYear: z.coerce.number().optional(),
  className: z.string().optional(),
  status: z.enum(['studying', 'reserved', 'dropped_out', 'graduated'], {
    required_error: 'Trạng thái là bắt buộc.',
  }),
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
      className: '',
      status: 'studying',
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
      const userData = {
        id: user.uid,
        email: values.email,
        role: 'student' as const,
        status: 'active' as const,
        createdAt: serverTimestamp(),
      };
      batch.set(userDocRef, userData);


      // 3. Create 'students' collection document
      const studentDocRef = doc(firestore, 'students', user.uid);
      const studentData = {
        ...values,
        id: user.uid,
        userId: user.uid,
        enrollmentYear: values.enrollmentYear || null,
        createdAt: serverTimestamp(),
      };
      batch.set(studentDocRef, studentData);
      
      // Commit the batch and handle potential errors
      batch.commit()
        .then(() => {
            toast({
                title: 'Thành công',
                description: `Sinh viên ${values.firstName} ${values.lastName} đã được tạo. Mật khẩu tạm thời: ${password}`,
                duration: 9000,
            });
            onFinished();
        })
        .catch(error => {
            console.error("Error committing batch:", error);
            // Create and emit a contextual error for debugging security rules
            const contextualError = new FirestorePermissionError({
                path: 'batch write (users, students)',
                operation: 'write',
                requestResourceData: { 
                    user: { path: userDocRef.path, data: userData },
                    student: { path: studentDocRef.path, data: studentData }
                },
            });
            errorEmitter.emit('permission-error', contextualError);
        });

    } catch (authError: any) {
        console.error("Error creating student auth user:", authError);
        toast({
            variant: 'destructive',
            title: 'Lỗi tạo tài khoản',
            description: authError.code === 'auth/email-already-in-use' ? 'Email này đã được sử dụng.' : `Không thể tạo tài khoản: ${authError.message}`,
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
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trạng thái</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="studying">Đang học</SelectItem>
                  <SelectItem value="reserved">Bảo lưu</SelectItem>
                  <SelectItem value="dropped_out">Đã nghỉ</SelectItem>
                  <SelectItem value="graduated">Đã tốt nghiệp</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="className"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Lớp</FormLabel>
                <FormControl>
                    <Input placeholder="22SE111" {...field} />
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
