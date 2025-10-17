'use client';

import { ChangePasswordForm } from '@/components/change-password-form';
import { ChangeEmailForm } from '@/components/change-email-form';
import { ProfileForm } from '@/components/profile-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading || !user || !userData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Hồ sơ cá nhân</CardTitle>
            <CardDescription>
              Quản lý thông tin cá nhân của bạn. Email không thể thay đổi tại đây.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm user={user} userData={userData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Đổi Email</CardTitle>
            <CardDescription>
                Nhập email mới và mật khẩu hiện tại của bạn để thay đổi email đăng nhập.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <ChangeEmailForm user={user} userData={userData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Đổi mật khẩu</CardTitle>
            <CardDescription>
                Để bảo mật, vui lòng không chia sẻ mật khẩu của bạn cho bất kỳ ai.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
