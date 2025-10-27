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
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { SystemUser } from '@/lib/types';
import type { User } from 'firebase/auth';
import { useEffect } from 'react';
import { Skeleton } from './ui/skeleton';
import { updateProfile } from 'firebase/auth';

const formSchema = z.object({
  displayName: z.string().min(3, { message: 'Tên hiển thị phải có ít nhất 3 ký tự.' }),
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
      displayName: '',
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
            } catch(e: any) {
                 console.error("Error syncing email:", e);
                toast({
                    variant: "destructive",
                    title: "Lỗi đồng bộ hóa email",
                    description: e.message,
                });
            }
        }
      }
      syncEmail();
  }, [user, userData, firestore, profileDocRef, toast]);


  useEffect(() => {
    if (userData) {
      form.reset({
        displayName: userData.displayName || '',
      });
    }
  }, [userData, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    
    try {
        const batch = writeBatch(firestore);
        
        // Update the users document
        const userDocRef = doc(firestore, 'users', user.uid);
        batch.update(userDocRef, { displayName: values.displayName });

        // Update the auth user profile
        await updateProfile(user, { displayName: values.displayName });

        await batch.commit();

        toast({
            title: 'Thành công',
            description: 'Thông tin hồ sơ của bạn đã được cập nhật.',
        });
    } catch (error: any) {
        console.error("Error updating profile:", error);
        toast({
            variant: "destructive",
            title: "Lỗi",
            description: error.message,
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
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên hiển thị</FormLabel>
              <FormControl>
                <Input placeholder="Nhập tên bạn muốn hiển thị" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
       
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </form>
    </Form>
  );
}
