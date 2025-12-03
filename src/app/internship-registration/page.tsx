"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useUser,
  useDoc,
  useFirestore,
  useMemoFirebase,
  useCollection,
} from "@/firebase";
import {
  doc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, ClipboardList } from "lucide-react";
import { InternshipRegistrationForm } from "@/components/internship-registration-form";
import {
  type DefenseRegistration,
  type GraduationDefenseSession,
  type SystemUser,
  type InternshipCompany,
  type EarlyInternship,
} from "@/lib/types";

export default function InternshipRegistrationPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [activeRegistration, setActiveRegistration] =
    useState<DefenseRegistration | null>(null);
  const [activeSession, setActiveSession] =
    useState<GraduationDefenseSession | null>(null);
  const [sessionCompanies, setSessionCompanies] = useState<InternshipCompany[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, "users", user.uid) : null),
    [user, firestore]
  );
  const { data: userData, isLoading: isUserDataLoading } =
    useDoc<SystemUser>(userDocRef);

  const allCompaniesCollectionRef = useMemoFirebase(
    () => collection(firestore, "internshipCompanies"),
    [firestore]
  );
  const { data: allCompanies, isLoading: isLoadingAllCompanies } =
    useCollection<InternshipCompany>(allCompaniesCollectionRef);

  const earlyInternshipQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, "earlyInternships"),
            where("studentId", "==", user.uid),
            where("status", "==", "completed")
          )
        : null,
    [user, firestore]
  );
  const {
    data: completedEarlyInternships,
    isLoading: isLoadingEarlyInternships,
  } = useCollection<EarlyInternship>(earlyInternshipQuery);
  const hasCompletedEarlyInternship =
    completedEarlyInternships && completedEarlyInternships.length > 0;
  const earlyInternshipData = hasCompletedEarlyInternship
    ? completedEarlyInternships[0]
    : null;

  useEffect(() => {
    const isLoading = isUserLoading || isUserDataLoading;
    if (isLoading) return;

    if (!user) {
      router.push("/login");
    } else if (userData && userData.role !== "student") {
      router.push("/");
    }
  }, [user, userData, isUserLoading, isUserDataLoading, router]);

  const fetchActiveData = async () => {
    if (!user || !firestore || isLoadingAllCompanies) return;

    setIsLoading(true);
    try {
      const sessionsQuery = query(
        collection(firestore, "graduationDefenseSessions"),
        where("status", "in", ["upcoming", "ongoing"]),
        where("sessionType", "in", ["internship", "combined"]) // Only internship-related sessions
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);

      if (sessionsSnapshot.empty) {
        setActiveSession(null);
        setActiveRegistration(null);
        return;
      }

      const sessionData = sessionsSnapshot.docs
        .map(
          (doc) => ({ id: doc.id, ...doc.data() } as GraduationDefenseSession)
        )
        .sort((a, b) => (a.status === "ongoing" ? -1 : 1))[0]; // Prioritize ongoing

      setActiveSession(sessionData);

      const registrationQuery = query(
        collection(firestore, "defenseRegistrations"),
        where("sessionId", "==", sessionData.id),
        where("studentDocId", "==", user.uid)
      );
      const registrationSnapshot = await getDocs(registrationQuery);

      if (!registrationSnapshot.empty) {
        const regData = {
          id: registrationSnapshot.docs[0].id,
          ...registrationSnapshot.docs[0].data(),
        } as DefenseRegistration;
        setActiveRegistration(regData);
      } else {
        setActiveRegistration(null); // Explicitly set to null if no registration found
      }

      // Filter all companies to get only the ones for the current session
      // If no companyIds configured, default to showing all companies to avoid empty lists
      if (allCompanies) {
        if (sessionData.companyIds && sessionData.companyIds.length > 0) {
          const companyIdSet = new Set(sessionData.companyIds);
          const companiesForSession = allCompanies.filter((company) =>
            companyIdSet.has(company.id)
          );
          setSessionCompanies(companiesForSession);
        } else {
          setSessionCompanies(allCompanies);
        }
      } else {
        setSessionCompanies([]);
      }
    } catch (error) {
      console.error("Error finding active registration:", error);
      setActiveRegistration(null);
      setActiveSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveData();
  }, [user, firestore, allCompanies, isLoadingAllCompanies]);

  if (
    isLoading ||
    isUserDataLoading ||
    isLoadingAllCompanies ||
    isLoadingEarlyInternships
  ) {
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

  const getAlertMessage = () => {
    if (!activeSession) {
      return {
        title: "Chưa có đợt đăng ký",
        description: "Hiện tại chưa có đợt đăng ký thực tập nào được mở.",
      };
    }
    if (!activeRegistration) {
      return {
        title: "Chưa được thêm vào đợt",
        description: `Bạn chưa được thêm vào đợt báo cáo "${activeSession.name}". Vui lòng liên hệ quản trị viên.`,
      };
    }
    if (activeRegistration.internship_companyName) {
      return {
        title: "Đã đăng ký",
        description: `Bạn đã đăng ký thực tập tại: ${activeRegistration.internship_companyName}. Bạn có thể cập nhật lại thông tin bên dưới nếu cần.`,
        variant: "default" as const,
      };
    }
    return null;
  };

  const alert = getAlertMessage();

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList />
              Đăng ký Thực tập Doanh nghiệp
            </CardTitle>
            <CardDescription>
              Đợt báo cáo: <strong>{activeSession?.name || "..."}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alert ? (
              <Alert variant={alert.variant || "destructive"}>
                <Info className="h-4 w-4" />
                <AlertTitle>{alert.title}</AlertTitle>
                <AlertDescription>{alert.description}</AlertDescription>
              </Alert>
            ) : null}

            {activeRegistration && (
              <div className="mt-6">
                <InternshipRegistrationForm
                  registration={activeRegistration}
                  sessionCompanies={sessionCompanies}
                  hasCompletedEarlyInternship={hasCompletedEarlyInternship}
                  earlyInternshipData={earlyInternshipData}
                  onSuccess={() => {
                    // A simple way to re-trigger the effect to get fresh data
                    fetchActiveData();
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
