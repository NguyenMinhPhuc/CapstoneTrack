
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
import type { DefenseRegistration, ProjectTopic, GraduationDefenseSession, DefenseSubCommittee } from "@/lib/types";

export function DashboardStats() {
  const { user } = useUser();
  const firestore = useFirestore();

  const gradRegistrationsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'defenseRegistrations'), where('supervisorId', '==', user.uid)) : null,
    [user, firestore]
  );
  const { data: gradRegistrations, isLoading: isLoadingGradRegs } = useCollection<DefenseRegistration>(gradRegistrationsQuery);
  
  const internRegistrationsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'defenseRegistrations'), where('internshipSupervisorId', '==', user.uid)) : null,
    [user, firestore]
  );
  const { data: internRegistrations, isLoading: isLoadingInternRegs } = useCollection<DefenseRegistration>(internRegistrationsQuery);

  const topicsQuery = useMemoFirebase(
      () => user ? query(collection(firestore, 'projectTopics'), where('supervisorId', '==', user.uid)) : null,
      [user, firestore]
  );
  const { data: topics, isLoading: isLoadingTopics } = useCollection<ProjectTopic>(topicsQuery);
  
  const allSessionsQuery = useMemoFirebase(() => collection(firestore, 'graduationDefenseSessions'), [firestore]);
  const { data: allSessions, isLoading: isLoadingAllSessions } = useCollection<GraduationDefenseSession>(allSessionsQuery);

  const [councilCount, setCouncilCount] = useState(0);
  const [isLoadingCouncilCount, setIsLoadingCouncilCount] = useState(true);

  useEffect(() => {
    const fetchCouncilData = async () => {
      if (!allSessions || !user) return;
      setIsLoadingCouncilCount(true);
      let count = 0;
      for (const session of allSessions) {
        try {
          const councilQuery = query(collection(firestore, `graduationDefenseSessions/${session.id}/council`), where('supervisorId', '==', user.uid));
          const subCommitteeSnapshot = await getDocs(collection(firestore, `graduationDefenseSessions/${session.id}/subCommittees`));
          
          const [councilSnapshot] = await Promise.all([
              getDocs(councilQuery),
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
  
  const stats = useMemo(() => {
    const gradStudentsCount = gradRegistrations?.length || 0;
    const internStudentsCount = internRegistrations?.length || 0;
    const topicsCount = topics?.length || 0;
    
    return {
        gradStudents: gradStudentsCount,
        topics: topicsCount,
        internStudents: internStudentsCount,
        councilCount: councilCount
    }

  }, [gradRegistrations, internRegistrations, topics, councilCount]);


  const isLoading = isLoadingAllSessions || isLoadingGradRegs || isLoadingInternRegs || isLoadingTopics || isLoadingCouncilCount;

  if (isLoading) {
    return <DashboardStats.Skeleton />;
  }
  
  const statsCards = [
    {
      title: "SV Hướng dẫn TN",
      total: stats.gradStudents,
      icon: <Users className="h-6 w-6 text-muted-foreground" />,
      change: "Tổng số từ trước đến nay",
    },
    {
      title: "Đề tài HD",
      total: stats.topics,
      icon: <FileText className="h-6 w-6 text-muted-foreground" />,
      change: "Tổng số đã đề xuất",
    },
    {
      title: "SV Hướng dẫn TT",
      total: stats.internStudents,
      icon: <Briefcase className="h-6 w-6 text-muted-foreground" />,
      change: "Tổng số từ trước đến nay",
    },
    {
      title: "Hội đồng đã tham gia",
      total: stats.councilCount,
      icon: <UserCheck className="h-6 w-6 text-muted-foreground" />,
      change: "Tổng số từ trước đến nay",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            {stat.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{stat.total}</div>
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
