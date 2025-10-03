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
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { SystemUser } from '@/lib/types';
import type { User } from 'firebase/auth';
import { useEffect } from 'react';
import { Skeleton } from './ui/skeleton';

const formSchema = z.object({
  firstName: z.string().min(1, { message: 'Họ là bắt buộc.' }),
  lastName: z.string().min(1, { message: 'Tên là bắt buộc.' }),
  email: z.string().email(),
});

interface ProfileFormProps {
  user: User;
  userData: SystemUser;
}

export function ProfileForm({ user, userData }: ProfileFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const profileDocRef = useMemoFirebase(() => {
    if (!user || !userData.role || (userData.role !== 'student' && userData.role !== 'supervisor')) return null;
    const collectionName = userData.role === 'student' ? 'students' : 'supervisors';
    return doc(firestore, collectionName, user.uid);
  }, [user, userData.role, firestore]);

  const { data: profileData, isLoading: isProfileLoading } = useDoc(profileDocRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: user.email || '',
      firstName: '',
      lastName: '',
    },
  });

  useEffect(() => {
    if (profileData) {
      form.reset({
        email: user.email || '',
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
      });
    }
  }, [profileData, user.email, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!profileDocRef) {
        toast({
            variant: 'destructive',
            title: 'Lỗi',
            description: 'Không thể cập nhật hồ sơ cho vai trò admin.',
        });
        return;
    }
    
    try {
      await updateDoc(profileDocRef, {
        firstName: values.firstName,
        lastName: values.lastName,
      });
      toast({
        title: 'Thành công',
        description: 'Thông tin hồ sơ của bạn đã được cập nhật.',
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Ôi! Đã xảy ra lỗi.',
        description: error.message || 'Không thể cập nhật hồ sơ.',
      });
    }
  }
  
  if (isProfileLoading) {
      return (
          <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
          </div>
      )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} readOnly disabled />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {userData.role !== 'admin' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        )}
       
        <Button type="submit" disabled={form.formState.isSubmitting || userData.role === 'admin'}>
          {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </form>
    </Form>
  );
}
