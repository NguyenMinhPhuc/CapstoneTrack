
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
import type { DefenseRegistration, ProjectTopic, GraduationDefenseSession, EarlyInternship, DefenseSubCommittee } from "@/lib/types";

export function DashboardStats() {
  const { user } = useUser();
  const firestore = useFirestore();

  // --- Fetch ALL relevant data for the supervisor ---
  const allSessionsQuery = useMemoFirebase(() => collection(firestore, 'defenseSessions'), [firestore]);
  const { data: allSessions, isLoading: isLoadingAllSessions } = useCollection<GraduationDefenseSession>(allSessionsQuery);

  const ongoingSessionIds = useMemo(() => allSessions?.filter(s => s.status === 'ongoing').map(s => s.id) || [], [allSessions]);

  const gradRegistrationsQuery = useMemoFirebase(
    () => {
        if (!user || ongoingSessionIds.length === 0) return null;
        return query(
            collection(firestore, 'defenseRegistrations'), 
            where('supervisorId', '==', user.uid),
            where('sessionId', 'in', ongoingSessionIds)
        );
    },
    [user, firestore, ongoingSessionIds]
  );
  const { data: gradRegistrations, isLoading: isLoadingGradRegs } = useCollection<DefenseRegistration>(gradRegistrationsQuery);
  
  const allGradRegistrationsCompletedQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'defenseRegistrations'), where('supervisorId', '==', user.uid), where('graduationStatus', '==', 'completed')) : null,
    [user, firestore]
  );
  const { data: gradRegistrationsCompleted, isLoading: isLoadingGradRegsCompleted } = useCollection<DefenseRegistration>(allGradRegistrationsCompletedQuery);
  
  const internRegistrationsQuery = useMemoFirebase(
    () => {
       if (!user || ongoingSessionIds.length === 0) return null;
       return query(
            collection(firestore, 'defenseRegistrations'), 
            where('internshipSupervisorId', '==', user.uid),
            where('sessionId', 'in', ongoingSessionIds)
       );
    },
    [user, firestore, ongoingSessionIds]
  );
  const { data: internRegistrations, isLoading: isLoadingInternRegs } = useCollection<DefenseRegistration>(internRegistrationsQuery);

  const allInternRegistrationsCompletedQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'defenseRegistrations'), where('internshipSupervisorId', '==', user.uid), where('internshipStatus', '==', 'completed')) : null,
    [user, firestore]
  );
  const { data: internRegistrationsCompleted, isLoading: isLoadingInternRegsCompleted } = useCollection<DefenseRegistration>(allInternRegistrationsCompletedQuery);


  const topicsQuery = useMemoFirebase(
      () => user ? query(collection(firestore, 'projectTopics'), where('supervisorId', '==', user.uid)) : null,
      [user, firestore]
  );
  const { data: topics, isLoading: isLoadingTopics } = useCollection<ProjectTopic>(topicsQuery);

  const earlyInternshipQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'earlyInternships'), where('supervisorId', '==', user.uid)) : null,
    [user, firestore]
  );
  const { data: earlyInternships, isLoading: isLoadingEarlyInternships } = useCollection<EarlyInternship>(earlyInternshipQuery);
  
  // --- Council participation count (this remains the same as it's a total count) ---
  const [councilCount, setCouncilCount] = useState(0);
  const [isLoadingCouncilCount, setIsLoadingCouncilCount] = useState(true);

  useEffect(() => {
    const fetchCouncilData = async () => {
      if (!allSessions || !user) return;
      setIsLoadingCouncilCount(true);
      let count = 0;
      for (const session of allSessions) {
        try {
          const councilQuery = query(collection(firestore, `defenseSessions/${session.id}/council`), where('supervisorId', '==', user.uid));
          const subCommitteeSnapshot = await getDocs(collection(firestore, `defenseSessions/${session.id}/subCommittees`));
          
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
  
  // --- Process data into ongoing vs. completed stats ---
  const stats = useMemo(() => {
    const ongoingSessionIds = new Set(allSessions?.filter(s => s.status === 'ongoing').map(s => s.id) || []);
    const completedSessionIds = new Set(allSessions?.filter(s => s.status === 'completed').map(s => s.id) || []);

    const gradStudentsOngoing = gradRegistrations?.filter(r => r.graduationStatus === 'reporting').length || 0;
    
    const gradStudentsCompletedCount = gradRegistrationsCompleted?.length || 0;

    const topicsOngoing = topics?.filter(t => ongoingSessionIds.has(t.sessionId) && t.status !== 'taken').length || 0;
    const topicsCompleted = topics?.filter(t => completedSessionIds.has(t.sessionId)).length || 0;
    
    // Regular internship students from defense registrations
    const internRegsOngoing = internRegistrations?.filter(r => r.internshipStatus === 'reporting').length || 0;
    
    // Early internship students
    const earlyInternsOngoing = earlyInternships?.filter(e => e.status === 'ongoing').length || 0;
    const earlyInternsCompleted = earlyInternships?.filter(e => e.status === 'completed').length || 0;
    
    const internRegsCompletedCount = internRegistrationsCompleted?.length || 0;

    return {
        gradStudents: { ongoing: gradStudentsOngoing, completed: gradStudentsCompletedCount },
        topics: { ongoing: topicsOngoing, completed: topicsCompleted },
        internStudents: { 
            ongoing: internRegsOngoing + earlyInternsOngoing, 
            completed: internRegsCompletedCount + earlyInternsCompleted 
        },
        councilCount: councilCount
    }

  }, [allSessions, gradRegistrations, gradRegistrationsCompleted, internRegistrations, internRegistrationsCompleted, topics, earlyInternships, councilCount]);


  const isLoading = isLoadingAllSessions || isLoadingGradRegs || isLoadingInternRegs || isLoadingTopics || isLoadingEarlyInternships || isLoadingCouncilCount || isLoadingGradRegsCompleted || isLoadingInternRegsCompleted;

  if (isLoading) {
    return <DashboardStats.Skeleton />;
  }
  
  const statsCards = [
    {
      title: "SV Hướng dẫn TN",
      ongoing: stats.gradStudents.ongoing,
      completed: stats.gradStudents.completed,
      icon: <Users className="h-6 w-6 text-muted-foreground" />,
    },
    {
      title: "Đề tài HD",
      ongoing: stats.topics.ongoing,
      completed: stats.topics.completed,
      icon: <FileText className="h-6 w-6 text-muted-foreground" />,
    },
    {
      title: "SV Hướng dẫn TT",
      ongoing: stats.internStudents.ongoing,
      completed: stats.internStudents.completed,
      icon: <Briefcase className="h-6 w-6 text-muted-foreground" />,
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
            {stat.total !== undefined ? (
              <>
                <div className="text-2xl font-bold font-headline">{stat.total}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </>
            ) : (
              <div className="space-y-1">
                 <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-headline">{stat.ongoing}</span>
                    <span className="text-xs text-muted-foreground">đang diễn ra</span>
                </div>
                 <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold font-headline text-muted-foreground/80">{stat.completed}</span>
                    <span className="text-xs text-muted-foreground">đã hoàn thành</span>
                </div>
              </div>
            )}
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
