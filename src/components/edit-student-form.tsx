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
import { useFirestore } from '@/firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { Student } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/firebase';

const formSchema = z.object({
  firstName: z.string().min(1, { message: 'Họ là bắt buộc.' }),
  lastName: z.string().min(1, { message: 'Tên là bắt buộc.' }),
  studentId: z.string().min(1, { message: 'MSSV là bắt buộc.' }),
  email: z.string().email({ message: 'Email không hợp lệ.' }).readonly(), // Make email readonly
  major: z.string().optional(),
  enrollmentYear: z.coerce.number().optional(),
  className: z.string().optional(),
  status: z.enum(['studying', 'reserved', 'dropped_out', 'graduated'], {
    required_error: 'Trạng thái là bắt buộc.',
  }),
});

interface EditStudentFormProps {
  student: Student;
  onFinished: () => void;
}

export function EditStudentForm({ student, onFinished }: EditStudentFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      studentId: student.studentId || '',
      email: student.email || '',
      major: student.major || '',
      enrollmentYear: student.enrollmentYear || undefined,
      className: student.className || '',
      status: student.status || 'studying',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const displayName = `${values.firstName} ${values.lastName}`.trim();
    
    try {
      const batch = writeBatch(firestore);
      
      // 1. Update student document
      const studentDocRef = doc(firestore, 'students', student.id);
      const { email, ...updateData } = values;
      const dataToUpdate = {
        ...updateData,
        enrollmentYear: updateData.enrollmentYear || null,
      };
      batch.update(studentDocRef, dataToUpdate);

      // 2. Update users document
      const userDocRef = doc(firestore, 'users', student.id);
      batch.update(userDocRef, { displayName: displayName });
      
      // 3. Update auth display name if it's the current user
      if (auth.currentUser && auth.currentUser.uid === student.id) {
          await updateProfile(auth.currentUser, { displayName });
      }

      await batch.commit();
      
      toast({
        title: 'Thành công',
        description: 'Thông tin sinh viên đã được cập nhật.',
      });
      onFinished();
    } catch (error: any) {
      console.error("Error updating student:", error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Không thể cập nhật thông tin: ${error.message}`,
      });
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
                <Input {...field} disabled />
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
            {form.formState.isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </form>
    </Form>
  );
}
