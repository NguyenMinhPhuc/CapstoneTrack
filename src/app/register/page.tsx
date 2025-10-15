'use client';

import { SignUpForm } from '@/components/sign-up-form';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { SystemSettings } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function RegisterPage() {
    const firestore = useFirestore();
    const settingsDocRef = useMemoFirebase(() => doc(firestore, 'systemSettings', 'features'), [firestore]);
    const { data: settings, isLoading } = useDoc<SystemSettings>(settingsDocRef);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <div className="w-full max-w-md space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }
    
    // Default to true if the setting is not defined yet
    const registrationAllowed = settings?.allowStudentRegistration ?? true;

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
            {registrationAllowed ? (
                <SignUpForm />
            ) : (
                <Alert variant="destructive">
                    <Lock className="h-4 w-4" />
                    <AlertTitle>Đăng ký bị khóa</AlertTitle>
                    <AlertDescription>
                        Chức năng đăng ký tài khoản mới hiện đang bị khóa bởi quản trị viên. Vui lòng quay lại sau.
                    </AlertDescription>
                </Alert>
            )}
        </div>
        </div>
    );
}

    