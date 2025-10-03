'use client';

import { SignInForm } from '@/components/sign-in-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <SignInForm />
      </div>
    </div>
  );
}
