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
import { useDoc, useFirestore, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { SystemUser } from '@/lib/types';
import type { User } from 'firebase/auth';
import { useEffect } from 'react';
import { Skeleton } from './ui/skeleton';

const formSchema = z.object({
  firstName: z.string().min(1, { message: 'Họ là bắt buộc.' }),
  lastName: z.string().min(1, { message: 'Tên là bắt buộc.' }),
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
      firstName: '',
      lastName: '',
    },
  });
  
  // This effect synchronizes the email in Firestore if it differs from the auth email.
  useEffect(() => {
      const syncEmail = async () => {
        if (user?.email && userData?.email && user.email !== userData.email) {
          
            const batch = writeBatch(firestore);
            const userDocRef = doc(firestore, 'users', user.uid);
            batch.update(userDocRef, { email: user.email });

            if (profileDocRef) {
                batch.update(profileDocRef, { email: user.email });
            }

            try {
                await batch.commit();
                toast({
                    title: 'Đồng bộ hóa thành công',
                    description: 'Email của bạn đã được cập nhật trên toàn hệ thống.',
                });
            } catch(e) {
                 const contextualError = new FirestorePermissionError({
                    path: `batch update for user ${user.uid}`,
                    operation: 'update',
                    requestResourceData: { email: user.email },
                });
                errorEmitter.emit('permission-error', contextualError);
            }
        }
      }
      syncEmail();
  }, [user, userData, firestore, profileDocRef, toast]);


  useEffect(() => {
    if (profileData) {
      form.reset({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
      });
    }
  }, [profileData, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!profileDocRef) {
        toast({
            variant: 'destructive',
            title: 'Lỗi',
            description: 'Không thể cập nhật hồ sơ cho vai trò admin.',
        });
        return;
    }
    
    const updateData = {
        firstName: values.firstName,
        lastName: values.lastName,
    };
    
    updateDoc(profileDocRef, updateData)
        .catch(error => {
            const contextualError = new FirestorePermissionError({
                path: profileDocRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', contextualError);
        });
    
      toast({
        title: 'Thành công',
        description: 'Thông tin hồ sơ của bạn đã được cập nhật.',
      });
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
        {userData.role !== 'admin' ? (
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
        ) : (
             <p className="text-sm text-muted-foreground">Không có thông tin hồ sơ (Họ, Tên) cho tài khoản Quản trị viên.</p>
        )}
       
        <Button type="submit" disabled={form.formState.isSubmitting || userData.role === 'admin'}>
          {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </form>
    </Form>
  );
}
