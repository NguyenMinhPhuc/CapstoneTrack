
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { InternshipSubmissionForm } from '@/components/internship-submission-form';
import { type DefenseRegistration, type GraduationDefenseSession, type SystemUser } from '@/lib/types';


export default function InternshipSubmissionPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [activeRegistration, setActiveRegistration] = useState<DefenseRegistration | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [isLoadingRegistration, setIsLoadingRegistration] = useState(true);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData, isLoading: isUserDataLoading } = useDoc<SystemUser>(userDocRef);

  useEffect(() => {
    const isLoading = isUserLoading || isUserDataLoading;
    if (isLoading) return;

    if (!user) {
      router.push('/login');
    } else if (userData && userData.role !== 'student') {
      router.push('/');
    }
  }, [user, userData, isUserLoading, isUserDataLoading, router]);

  useEffect(() => {
    if (!user || !firestore) return;

    const findActiveRegistration = async () => {
        setIsLoadingRegistration(true);
        try {
            const ongoingSessionsQuery = query(
                collection(firestore, 'graduationDefenseSessions'),
                where('status', '==', 'ongoing')
            );
            const ongoingSessionsSnapshot = await getDocs(ongoingSessionsQuery);

            if (ongoingSessionsSnapshot.empty) {
                setActiveRegistration(null);
                setSessionName('');
                setIsLoadingRegistration(false);
                return;
            }

            const ongoingSessionIds = ongoingSessionsSnapshot.docs.map(doc => doc.id);
            const ongoingSessionsMap = new Map(ongoingSessionsSnapshot.docs.map(doc => [doc.id, doc.data() as GraduationDefenseSession]));

            const registrationQuery = query(
                collection(firestore, 'defenseRegistrations'),
                where('sessionId', 'in', ongoingSessionIds),
                where('studentDocId', '==', user.uid)
            );
            const registrationSnapshot = await getDocs(registrationQuery);

            if (!registrationSnapshot.empty) {
                const regDoc = registrationSnapshot.docs[0];
                const registrationData = { id: regDoc.id, ...regDoc.data() } as DefenseRegistration;
                
                setActiveRegistration(registrationData);

                const sessionData = ongoingSessionsMap.get(registrationData.sessionId);
                if (sessionData) {
                    setSessionName(sessionData.name);
                }

            } else {
                setActiveRegistration(null);
                setSessionName('');
            }
        } catch (error) {
            console.error("Error finding active registration:", error);
            setActiveRegistration(null);
            setSessionName('');
        } finally {
            setIsLoadingRegistration(false);
        }
    };

    findActiveRegistration();
  }, [user, firestore]);

  const isLoading = isUserLoading || isUserDataLoading || isLoadingRegistration;

  if (isLoading || !user || !userData) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4 mt-2" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
            <CardHeader>
                <CardTitle>Nộp Hồ sơ Thực tập Doanh nghiệp</CardTitle>
                <CardDescription>
                    Cập nhật thông tin và tài liệu thực tập của bạn cho đợt: <strong>{sessionName || '...'}</strong>
                </CardDescription>
            </CardHeader>
            <CardContent>
                {activeRegistration ? (
                    <InternshipSubmissionForm registration={activeRegistration} />
                ) : (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Chưa đến thời gian nộp hồ sơ</AlertTitle>
                        <AlertDescription>
                            Bạn hiện chưa được đăng ký vào một đợt báo cáo nào đang diễn ra. Vui lòng quay lại sau khi có thông báo từ khoa.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
      </div>
    </main>
  );
}
