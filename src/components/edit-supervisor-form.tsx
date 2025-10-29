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
import { useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { Supervisor, SystemUser } from '@/lib/types';
import { Checkbox } from './ui/checkbox';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/firebase';

const formSchema = z.object({
  firstName: z.string().min(1, { message: 'Họ là bắt buộc.' }),
  lastName: z.string().min(1, { message: 'Tên là bắt buộc.' }),
  email: z.string().email({ message: 'Email không hợp lệ.' }).readonly(), // Email is linked to auth, should not be changed here.
  department: z.string().min(1, { message: 'Khoa/Bộ môn là bắt buộc.' }),
  facultyRank: z.string().optional(),
  canGuideGraduation: z.boolean().default(true),
  canGuideInternship: z.boolean().default(false),
});

interface EditSupervisorFormProps {
  supervisor: Supervisor;
  onFinished: () => void;
}

export function EditSupervisorForm({ supervisor, onFinished }: EditSupervisorFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  
  const { data: user } = useDoc<SystemUser>(doc(firestore, 'users', supervisor.id));


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: supervisor.firstName || '',
      lastName: supervisor.lastName || '',
      email: supervisor.email || '',
      department: supervisor.department || '',
      facultyRank: supervisor.facultyRank || '',
      canGuideGraduation: supervisor.canGuideGraduation ?? true,
      canGuideInternship: supervisor.canGuideInternship ?? false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    
    const displayName = `${values.firstName} ${values.lastName}`.trim();
    
    try {
      const batch = writeBatch(firestore);

      // 1. Update supervisor document
      const supervisorDocRef = doc(firestore, 'supervisors', supervisor.id);
      const { email, ...updateData } = values;
      batch.update(supervisorDocRef, updateData);

      // 2. Update user document
      const userDocRef = doc(firestore, 'users', supervisor.id);
      batch.update(userDocRef, { displayName: displayName });

      // 3. Update auth display name
      if (auth.currentUser && auth.currentUser.uid === supervisor.id) {
        await updateProfile(auth.currentUser, { displayName });
      } else {
        // This case is for an admin editing another user.
        // There is no direct client-side SDK method to update another user's auth profile.
        // This would typically be handled by a Cloud Function.
        console.warn("Cannot update auth profile for another user from the client.");
      }

      await batch.commit();
      
      toast({
        title: 'Thành công',
        description: 'Thông tin giáo viên đã được cập nhật.',
      });
      onFinished();
    } catch (error: any) {
      console.error("Error updating supervisor:", error);
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
         <div className="space-y-2">
            <FormLabel>Phạm vi hướng dẫn</FormLabel>
            <div className="flex items-center space-x-4">
                 <FormField
                    control={form.control}
                    name="canGuideGraduation"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                Hướng dẫn Đồ án Tốt nghiệp
                                </FormLabel>
                            </div>
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="canGuideInternship"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                Hướng dẫn Thực tập
                                </FormLabel>
                            </div>
                        </FormItem>
                    )}
                 />
            </div>
        </div>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </form>
    </Form>
  );
}