
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
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { doc, serverTimestamp, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { Checkbox } from './ui/checkbox';

const formSchema = z.object({
  firstName: z.string().min(1, { message: 'Họ là bắt buộc.' }),
  lastName: z.string().min(1, { message: 'Tên là bắt buộc.' }),
  email: z.string().email({ message: 'Email không hợp lệ.' }),
  department: z.string().min(1, { message: 'Khoa/Bộ môn là bắt buộc.' }),
  facultyRank: z.string().optional(),
  canGuideGraduation: z.boolean().default(true),
  canGuideInternship: z.boolean().default(false),
});

interface AddSupervisorFormProps {
  onFinished: () => void;
}

const getSecondaryApp = () => {
  const secondaryAppName = 'secondary-app-for-supervisor-creation';
  const existingApp = getApps().find(app => app.name === secondaryAppName);
  return existingApp || initializeApp(firebaseConfig, secondaryAppName);
};

export function AddSupervisorForm({ onFinished }: AddSupervisorFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      department: '',
      facultyRank: '',
      canGuideGraduation: true,
      canGuideInternship: false,
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
        const userCredential = await createUserWithEmailAndPassword(tempAuth, values.email, password);
        const user = userCredential.user;

        // After creating the user, immediately send a password reset email
        // This allows them to set their own password securely.
        await sendPasswordResetEmail(tempAuth, values.email);

        const batch = writeBatch(firestore);

        const userDocRef = doc(firestore, 'users', user.uid);
        const userData = {
            id: user.uid,
            email: values.email,
            role: 'supervisor' as const,
            status: 'active' as const,
            passwordInitialized: true, // User will set their own password
            createdAt: serverTimestamp(),
        };
        batch.set(userDocRef, userData);

        const supervisorDocRef = doc(firestore, 'supervisors', user.uid);
        const supervisorData = {
            ...values,
            id: user.uid,
            userId: user.uid,
            createdAt: serverTimestamp(),
        };
        batch.set(supervisorDocRef, supervisorData);

        // Chain a .catch to the batch commit to handle Firestore permission errors
        batch.commit()
            .then(() => {
                toast({
                    title: 'Thành công',
                    description: `Đã tạo tài khoản cho ${values.firstName} ${values.lastName}. Một email hướng dẫn tạo mật khẩu đã được gửi đến họ.`,
                    duration: 9000,
                });
                onFinished();
            })
            .catch((error) => {
                console.error("Error committing batch:", error);
                // Create and emit a contextual error for debugging security rules
                const contextualError = new FirestorePermissionError({
                    path: 'batch write (users, supervisors)', // Describe the batch operation
                    operation: 'write',
                    requestResourceData: {
                        user: { path: userDocRef.path, data: userData },
                        supervisor: { path: supervisorDocRef.path, data: supervisorData },
                    },
                });
                errorEmitter.emit('permission-error', contextualError);
            });

    } catch (authError: any) {
        console.error("Error creating supervisor auth user:", authError);
        toast({
            variant: 'destructive',
            title: 'Lỗi tạo tài khoản',
            description: authError.code === 'auth/email-already-in-use' ? 'Email này đã được sử dụng.' : `Không thể tạo tài khoản: ${authError.message}`,
        });
    } finally {
        // Ensure temporary user is signed out
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
            {form.formState.isSubmitting ? "Đang tạo..." : "Tạo Giáo viên"}
        </Button>
      </form>
    </Form>
  );
}
