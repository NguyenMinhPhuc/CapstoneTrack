
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
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { doc, serverTimestamp, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Student, SystemUser } from '@/lib/types';

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
    // Check if email already exists in 'users' collection
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('email', '==', values.email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        toast({
            variant: 'destructive',
            title: 'Email đã tồn tại',
            description: 'Email này đã được sử dụng cho một tài khoản khác.',
        });
        return;
    }

    const secondaryApp = getSecondaryApp();
    const tempAuth = getAuth(secondaryApp);
    const password = uuidv4(); // Generate a strong random password

    try {
      // 1. Create Auth user
      const userCredential = await createUserWithEmailAndPassword(tempAuth, values.email, password);
      const user = userCredential.user;
      
      const displayName = `${values.firstName} ${values.lastName}`.trim();
      await updateProfile(user, { displayName });

      // 2. Send password reset email
      await sendPasswordResetEmail(tempAuth, values.email);

      const batch = writeBatch(firestore);

      // 3. Create 'users' collection document
      const userDocRef = doc(firestore, 'users', user.uid);
      const userData: Partial<SystemUser> = {
        id: user.uid,
        email: values.email,
        displayName: displayName,
        role: 'student' as const,
        status: 'active' as const,
        createdAt: serverTimestamp(),
      };
      batch.set(userDocRef, userData);


      // 4. Create 'students' collection document
      const studentDocRef = doc(firestore, 'students', user.uid);
      const studentData: Partial<Student> = {
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
                description: `Đã tạo tài khoản cho sinh viên ${values.firstName} ${values.lastName}. Một email hướng dẫn tạo mật khẩu đã được gửi đến họ.`,
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
