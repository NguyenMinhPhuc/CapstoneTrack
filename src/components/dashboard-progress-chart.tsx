
"use client";

import React, { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { useUser, useCollection, useMemoFirebase, useFirestore } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { DefenseRegistration, ProjectTopic, GraduationDefenseSession } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";

const getAcademicYear = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = January, 7 = August

  if (month >= 7) { // August or later
    return `${year}-${year + 1}`;
  } else { // July or earlier
    return `${year - 1}-${year}`;
  }
};

const chartConfig = {
  topics: {
    label: "Đề tài",
    color: "hsl(var(--chart-1))",
  },
  students: {
    label: "Sinh viên",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function DashboardProgressChart() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const sessionsQuery = useMemoFirebase(() => collection(firestore, 'defenseSessions'), [firestore]);
  const { data: allSessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsQuery);

  const topicsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'projectTopics'), where('supervisorId', '==', user.uid)) : null,
    [user, firestore]
  );
  const { data: topics, isLoading: isLoadingTopics } = useCollection<ProjectTopic>(topicsQuery);

  const registrationsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'defenseRegistrations'), where('supervisorId', '==', user.uid)) : null,
    [user, firestore]
  );
  const { data: registrations, isLoading: isLoadingRegs } = useCollection<DefenseRegistration>(registrationsQuery);
  
  const isLoading = isUserLoading || isLoadingSessions || isLoadingTopics || isLoadingRegs;

  const chartData = useMemo(() => {
    if (!allSessions || !topics || !registrations) {
      return [];
    }

    const toDate = (timestamp: any): Date | null => {
        if (!timestamp) return null;
        if (timestamp.toDate) return timestamp.toDate();
        return new Date(timestamp);
    }
    
    const sessionYearMap = new Map<string, string>();
    allSessions.forEach(session => {
        const startDate = toDate(session.startDate);
        if(startDate) {
            sessionYearMap.set(session.id, getAcademicYear(startDate));
        }
    });

    const yearlyData: Record<string, { year: string, topics: number, students: Set<string> }> = {};

    topics.forEach(topic => {
      const year = sessionYearMap.get(topic.sessionId);
      if (year) {
        if (!yearlyData[year]) {
          yearlyData[year] = { year, topics: 0, students: new Set() };
        }
        yearlyData[year].topics++;
      }
    });
    
    registrations.forEach(reg => {
       const year = sessionYearMap.get(reg.sessionId);
       if (year) {
         if (!yearlyData[year]) {
            yearlyData[year] = { year, topics: 0, students: new Set() };
         }
         yearlyData[year].students.add(reg.studentId);
       }
    });
    
    return Object.values(yearlyData)
      .map(data => ({
        year: data.year,
        topics: data.topics,
        students: data.students.size,
      }))
      .sort((a, b) => a.year.localeCompare(b.year))
      .slice(-5); // Get the last 5 academic years

  }, [allSessions, topics, registrations]);


  if (isLoading) {
      return <Skeleton className="h-[400px] w-full rounded-lg" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thống kê Hướng dẫn</CardTitle>
        <CardDescription>Số lượng đề tài và sinh viên đã hướng dẫn trong 5 năm gần nhất</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
              <XAxis
                dataKey="year"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Legend />
              <Bar dataKey="topics" fill="var(--color-topics)" radius={4} />
              <Bar dataKey="students" fill="var(--color-students)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
