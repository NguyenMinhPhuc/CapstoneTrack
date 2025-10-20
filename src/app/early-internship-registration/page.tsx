
'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, collection, query, where } from 'firebase/firestore';
import { EarlyInternshipForm } from '@/components/early-internship-form';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { EarlyInternship } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function EarlyInternshipRegistrationPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const studentDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'students', user.uid);
  }, [user, firestore]);
  const { data: studentData } = useDoc(studentDocRef);


  const earlyInternshipsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'earlyInternships'), where('studentId', '==', user.uid));
  }, [user, firestore]);
  
  const { data: pastRegistrations, isLoading: isLoadingRegistrations } = useCollection<EarlyInternship>(earlyInternshipsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
     if (!isUserDataLoading && userData && userData.role !== 'student') {
      router.push('/');
    }
  }, [user, userData, isUserLoading, isUserDataLoading, router]);

  const isLoading = isUserLoading || isUserDataLoading || isLoadingRegistrations;

  if (isLoading || !userData || !user) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

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
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Tạo Đơn đăng ký mới
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Đơn đăng ký Thực tập sớm</DialogTitle>
                        </DialogHeader>
                        {user && studentData && (
                            <EarlyInternshipForm
                                user={user}
                                student={studentData}
                                onFinished={handleFormSuccess}
                            />
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
