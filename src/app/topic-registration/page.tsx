
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, BookMarked } from 'lucide-react';
import { type DefenseRegistration, type GraduationDefenseSession, type SystemUser, type ProjectTopic } from '@/lib/types';
import { TopicRegistrationList } from '@/components/topic-registration-list';

export default function TopicRegistrationPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [activeRegistration, setActiveRegistration] = useState<DefenseRegistration | null>(null);
  const [activeSession, setActiveSession] = useState<GraduationDefenseSession | null>(null);
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
                where('status', 'in', ['ongoing', 'upcoming'])
            );
            const ongoingSessionsSnapshot = await getDocs(ongoingSessionsQuery);

            if (ongoingSessionsSnapshot.empty) {
                setActiveRegistration(null);
                setActiveSession(null);
                setIsLoadingRegistration(false);
                return;
            }

            const ongoingSessionsMap = new Map(ongoingSessionsSnapshot.docs.map(doc => [doc.id, doc.data() as GraduationDefenseSession]));
            
            // Prioritize ongoing session, then upcoming
            const sessionToSearch = 
                ongoingSessionsSnapshot.docs.find(s => s.data().status === 'ongoing') || 
                ongoingSessionsSnapshot.docs[0];

            const sessionData = ongoingSessionsMap.get(sessionToSearch.id)!;
            setActiveSession(sessionData);

            const registrationQuery = query(
                collection(firestore, 'defenseRegistrations'),
                where('sessionId', '==', sessionToSearch.id),
                where('studentDocId', '==', user.uid)
            );
            const registrationSnapshot = await getDocs(registrationQuery);

            if (!registrationSnapshot.empty) {
                const regDoc = registrationSnapshot.docs[0];
                setActiveRegistration({ id: regDoc.id, ...regDoc.data() } as DefenseRegistration);
            } else {
                setActiveRegistration(null);
            }
        } catch (error) {
            console.error("Error finding active registration:", error);
            setActiveRegistration(null);
            setActiveSession(null);
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
                </div>
            </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BookMarked />
                    Đăng ký Đề tài Tốt nghiệp
                </CardTitle>
                <CardDescription>
                    Xem danh sách các đề tài có sẵn và đăng ký cho đợt: <strong>{activeSession?.name || '...'}</strong>
                </CardDescription>
            </CardHeader>
        </Card>
        
        {!activeSession && (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Chưa có đợt báo cáo nào</AlertTitle>
                <AlertDescription>
                    Hiện tại chưa có đợt báo cáo nào đang hoặc sắp diễn ra. Vui lòng quay lại sau.
                </AlertDescription>
            </Alert>
        )}

        {activeSession && !activeRegistration && (
             <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Chưa được thêm vào đợt</AlertTitle>
                <AlertDescription>
                    Bạn chưa được thêm vào đợt báo cáo <span className="font-semibold">{activeSession.name}</span>. Vui lòng liên hệ quản trị viên.
                </AlertDescription>
            </Alert>
        )}

        {activeSession && activeRegistration && (
            activeRegistration.projectTitle ? (
                 <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Bạn đã có đề tài</AlertTitle>
                    <AlertDescription>
                        Bạn đã đăng ký đề tài: <span className="font-semibold">{activeRegistration.projectTitle}</span>.
                    </AlertDescription>
                </Alert>
            ) : (
                <TopicRegistrationList session={activeSession} registration={activeRegistration} />
            )
        )}
      </div>
    </main>
  );
}
