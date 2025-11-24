"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
} from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import type {
  DefenseRegistration,
  DefenseSession,
  Student,
  StudentWithRegistrationDetails,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentRegistrationTable } from "@/components/student-registration-table";

export default function GraduationRegistrationsAdminPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "users", user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  // Load all graduation sessions
  const sessionsCollectionRef = useMemoFirebase(
    () => collection(firestore, "graduationDefenseSessions"),
    [firestore]
  );
  const { data: sessions, isLoading: isSessionsLoading } =
    useCollection<DefenseSession>(sessionsCollectionRef);

  // Selected session handling
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  useEffect(() => {
    const loading = isUserLoading || isUserDataLoading;
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (userData && userData.role !== "admin") {
      router.push("/");
      return;
    }
  }, [user, userData, isUserLoading, isUserDataLoading, router]);

  // Pick a sensible default session when list loads
  useEffect(() => {
    if (!sessions || sessions.length === 0) return;
    if (selectedSessionId) return;
    const ongoing = sessions.find((s) => s.status === "ongoing");
    const upcoming = sessions.find((s) => s.status === "upcoming");
    setSelectedSessionId(ongoing?.id || upcoming?.id || sessions[0].id);
  }, [sessions, selectedSessionId]);

  // Look up the selected session object
  const selectedSession = useMemo(() => {
    if (!sessions || !selectedSessionId) return null;
    return sessions.find((s) => s.id === selectedSessionId) || null;
  }, [sessions, selectedSessionId]);

  // Registrations for selected session
  const registrationsQuery = useMemoFirebase(
    () =>
      selectedSessionId
        ? query(
            collection(firestore, "defenseRegistrations"),
            where("sessionId", "==", selectedSessionId)
          )
        : null,
    [firestore, selectedSessionId]
  );
  const { data: registrations, isLoading: areRegistrationsLoading } =
    useCollection<DefenseRegistration>(registrationsQuery);

  // All students for enrichment
  const studentsCollectionRef = useMemoFirebase(
    () => collection(firestore, "students"),
    [firestore]
  );
  const { data: allStudents, isLoading: areStudentsLoading } =
    useCollection<Student>(studentsCollectionRef);

  const combinedRegistrationData = useMemo<
    StudentWithRegistrationDetails[] | null
  >(() => {
    if (!registrations || !allStudents) return null;
    const studentMap = new Map(allStudents.map((s) => [s.id, s]));
    return registrations
      .map((reg) => {
        const sd = studentMap.get(reg.studentDocId);
        return {
          ...reg,
          status: sd?.status || "studying",
          className: sd?.className || "",
        };
      })
      .filter((r) => r.status === "studying");
  }, [registrations, allStudents]);

  const overallLoading =
    isUserLoading ||
    isUserDataLoading ||
    isSessionsLoading ||
    areRegistrationsLoading ||
    areStudentsLoading;

  if (overallLoading || !user || !userData || userData.role !== "admin") {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="p-8">
          <Skeleton className="h-10 w-1/3 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-96 w-full mt-8" />
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Danh sách SV Tốt nghiệp theo đợt</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="w-full sm:w-80">
            <Select
              value={selectedSessionId}
              onValueChange={setSelectedSessionId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn Đợt tốt nghiệp" />
              </SelectTrigger>
              <SelectContent>
                {sessions?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedSession && (
        <StudentRegistrationTable
          sessionId={selectedSession.id}
          sessionType={selectedSession.sessionType}
          initialData={combinedRegistrationData}
          isLoading={overallLoading}
        />
      )}
    </main>
  );
}
