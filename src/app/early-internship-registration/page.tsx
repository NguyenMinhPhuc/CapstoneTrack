'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useDoc, useMemoFirebase, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, collection, query, where, deleteDoc } from 'firebase/firestore';
import { EarlyInternshipForm } from '@/components/early-internship-form';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { EarlyInternship } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

export default function EarlyInternshipRegistrationPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const studentDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'students', user.uid);
  }, [user, firestore]);
  const { data: studentData, isLoading: isLoadingStudentData } = useDoc(studentDocRef);


  const earlyInternshipsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'earlyInternships'), where('studentId', '==', user.uid));
  }, [user, firestore]);
  
  const { data: pastRegistrations, isLoading: isLoadingRegistrations } = useCollection<EarlyInternship>(earlyInternshipsQuery);

  useEffect(() => {
    // This effect can stay as it is, ensuring only students can access the page.
    if (isUserLoading || isUserDataLoading) return;
    if (!user) {
        router.push('/login');
    } else if (userData && userData.role !== 'student') {
        router.push('/');
    }
}, [user, userData, isUserLoading, isUserDataLoading, router]);


  const isLoading = isUserLoading || isUserDataLoading || isLoadingRegistrations || isLoadingStudentData;

  const handleFormSuccess = () => {
    setIsFormOpen(false);
  };
  
  const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    return timestamp;
  };
  
  const handleCancelRegistration = async (registrationId: string) => {
    setIsCancelling(true);
    const docRef = doc(firestore, 'earlyInternships', registrationId);
    
    deleteDoc(docRef)
      .then(() => {
        toast({
            title: 'Thành công',
            description: 'Bạn đã hủy đăng ký thực tập sớm thành công.',
        });
      })
      .catch((error) => {
         const contextualError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', contextualError);
         toast({
            variant: 'destructive',
            title: 'Lỗi',
            description: 'Không thể hủy đăng ký. Vui lòng thử lại.',
        });
      })
      .finally(() => {
        setIsCancelling(false);
      });
  };

  if (isLoading || !user) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Đăng ký Thực tập sớm</CardTitle>
                <CardDescription>Nộp và quản lý các đơn đăng ký thực tập sớm của bạn.</CardDescription>
              </div>
               <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button disabled={!studentData}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Tạo Đơn đăng ký mới
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Đơn đăng ký Thực tập sớm</DialogTitle>
                        </DialogHeader>
                        {user && studentData ? (
                            <EarlyInternshipForm
                                user={user}
                                student={studentData}
                                onFinished={handleFormSuccess}
                            />
                        ) : (
                          <Alert variant="destructive">
                              <AlertTitle>Lỗi</AlertTitle>
                              <AlertDescription>Không thể tải hồ sơ sinh viên của bạn. Vui lòng thử lại.</AlertDescription>
                          </Alert>
                        )}
                    </DialogContent>
                </Dialog>
          </CardHeader>
          <CardContent>
              {pastRegistrations && pastRegistrations.length > 0 ? (
                <div className="space-y-4">
                  {pastRegistrations.map(reg => (
                    <Card key={reg.id} className="bg-muted/30">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">{reg.companyName}</CardTitle>
                                    <CardDescription>{reg.companyAddress}</CardDescription>
                                </div>
                                <Badge>{reg.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Người hướng dẫn tại ĐV:</span>
                                <span>{reg.supervisorName || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Ngày bắt đầu:</span>
                                <span>{toDate(reg.startDate) ? format(toDate(reg.startDate)!, 'dd/MM/yyyy') : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Ngày kết thúc:</span>
                                <span>{toDate(reg.endDate) ? format(toDate(reg.endDate)!, 'dd/MM/yyyy') : 'N/A'}</span>
                            </div>
                        </CardContent>
                        {reg.status === 'pending_approval' && (
                            <CardFooter>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm" className="w-full" disabled={isCancelling}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            {isCancelling ? 'Đang hủy...' : 'Hủy Đăng ký'}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Xác nhận hủy?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Bạn có chắc chắn muốn hủy đơn đăng ký thực tập tại <strong>{reg.companyName}</strong> không? Hành động này không thể hoàn tác.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Không</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleCancelRegistration(reg.id)}>Xác nhận hủy</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardFooter>
                        )}
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert>
                    <AlertTitle>Chưa có đăng ký nào</AlertTitle>
                    <AlertDescription>Bạn chưa có đơn đăng ký thực tập sớm nào. Nhấn "Tạo Đơn đăng ký mới" để bắt đầu.</AlertDescription>
                </Alert>
              )}
          </CardContent>
      </Card>
    </div>
  );
}
