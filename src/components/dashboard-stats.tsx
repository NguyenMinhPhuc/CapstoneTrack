
'use client';

import { useMemo, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, Briefcase, UserCheck } from "lucide-react";
import { useUser, useCollection, useMemoFirebase, useFirestore } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { DefenseRegistration, ProjectTopic, DefenseSession, EarlyInternship, DefenseCouncilMember, DefenseSubCommittee } from "@/lib/types";

export function DashboardStats() {
  const { user } = useUser();
  const firestore = useFirestore();

  // Fetch ongoing sessions
  const ongoingSessionsQuery = useMemoFirebase(
    () => query(collection(firestore, 'defenseSessions'), where('status', '==', 'ongoing')),
    [firestore]
  );
  const { data: ongoingSessions, isLoading: isLoadingSessions } = useCollection<DefenseSession>(ongoingSessionsQuery);
  const ongoingSessionIds = useMemo(() => ongoingSessions?.map(s => s.id) || [], [ongoingSessions]);

  // Fetch data related to the current supervisor FOR ONGOING SESSIONS
  const gradRegistrationsQuery = useMemoFirebase(
    () => user && ongoingSessionIds.length > 0 ? query(collection(firestore, 'defenseRegistrations'), where('supervisorId', '==', user.uid), where('sessionId', 'in', ongoingSessionIds)) : null,
    [user, ongoingSessionIds]
  );
  const { data: gradRegistrations, isLoading: isLoadingGradRegs } = useCollection<DefenseRegistration>(gradRegistrationsQuery);
  
  const internRegistrationsQuery = useMemoFirebase(
    () => user && ongoingSessionIds.length > 0 ? query(collection(firestore, 'defenseRegistrations'), where('internshipSupervisorId', '==', user.uid), where('sessionId', 'in', ongoingSessionIds)) : null,
    [user, ongoingSessionIds]
  );
  const { data: internRegistrations, isLoading: isLoadingInternRegs } = useCollection<DefenseRegistration>(internRegistrationsQuery);


  const topicsQuery = useMemoFirebase(
      () => user && ongoingSessionIds.length > 0 ? query(collection(firestore, 'projectTopics'), where('supervisorId', '==', user.uid), where('sessionId', 'in', ongoingSessionIds)) : null,
      [user, ongoingSessionIds]
  );
  const { data: topics, isLoading: isLoadingTopics } = useCollection<ProjectTopic>(topicsQuery);

  const earlyInternshipQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'earlyInternships'), where('supervisorId', '==', user.uid), where('status', '==', 'ongoing')) : null,
    [user]
  );
  const { data: earlyInternships, isLoading: isLoadingEarlyInternships } = useCollection<EarlyInternship>(earlyInternshipQuery);
  
  // Fetch ALL sessions to count council participations across all time
  const allSessionsQuery = useMemoFirebase(() => collection(firestore, 'defenseSessions'), [firestore]);
  const { data: allSessions, isLoading: isLoadingAllSessions } = useCollection<DefenseSession>(allSessionsQuery);

  const [councilCount, setCouncilCount] = useState(0);
  const [isLoadingCouncilCount, setIsLoadingCouncilCount] = useState(true);

  // This effect is complex and needs to run once allSessions and user are available
  useEffect(() => {
    const fetchCouncilData = async () => {
      if (!allSessions || !user) return;
      setIsLoadingCouncilCount(true);
      let count = 0;
      for (const session of allSessions) {
        try {
          const councilQuery = query(collection(firestore, `defenseSessions/${session.id}/council`), where('supervisorId', '==', user.uid));
          const subCommitteeQuery = query(collection(firestore, `defenseSessions/${session.id}/subCommittees`));
          
          const [councilSnapshot, subCommitteeSnapshot] = await Promise.all([
              getDocs(councilQuery),
              getDocs(subCommitteeQuery)
          ]);

          count += councilSnapshot.size;
          
          subCommitteeSnapshot.forEach(doc => {
              const subCommittee = doc.data() as DefenseSubCommittee;
              if (subCommittee.members?.some(member => member.supervisorId === user.uid)) {
                  count++;
              }
          });
        } catch(e) {
          console.error(`Could not fetch council data for session ${session.id}`, e);
        }
      }
      setCouncilCount(count);
      setIsLoadingCouncilCount(false);
    };

    fetchCouncilData();
  }, [allSessions, user, firestore]);

  const isLoading = isLoadingSessions || isLoadingGradRegs || isLoadingTopics || isLoadingInternships || isLoadingCouncilCount || isLoadingAllSessions || isLoadingInternRegs;
  
  const totalInternshipStudents = (internRegistrations?.length || 0) + (earlyInternships?.length || 0);

  if (isLoading) {
    return <DashboardStats.Skeleton />;
  }
  
  const stats = [
    {
      title: "SV Hướng dẫn TN",
      value: gradRegistrations?.length ?? 0,
      icon: <Users className="h-6 w-6 text-muted-foreground" />,
      change: "Trong các đợt đang diễn ra",
    },
    {
      title: "Đề tài HD",
      value: topics?.length ?? 0,
      icon: <FileText className="h-6 w-6 text-muted-foreground" />,
      change: "Trong các đợt đang diễn ra",
    },
    {
      title: "SV Hướng dẫn TT",
      value: totalInternshipStudents,
      icon: <Briefcase className="h-6 w-6 text-muted-foreground" />,
      change: "Đợt chính thức & thực tập sớm",
    },
    {
      title: "Hội đồng đã tham gia",
      value: councilCount,
      icon: <UserCheck className="h-6 w-6 text-muted-foreground" />,
      change: "Tổng số từ trước đến nay",
    },
  ];


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            {stat.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

DashboardStats.Skeleton = function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
         <Card key={i}>
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-2/4" />
            <Skeleton className="h-6 w-6 rounded-sm" />
         </CardHeader>
         <CardContent>
            <Skeleton className="h-7 w-1/4 mb-2" />
            <Skeleton className="h-3 w-3/4" />
         </CardContent>
       </Card>
      ))}
    </div>
  );
};
