"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
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
import { Info, Users, FileSignature, FileUp } from "lucide-react";
import { ReportSubmissionForm } from "@/components/report-submission-form";
import {
  type DefenseRegistration,
  type GraduationDefenseSession,
  type SystemUser,
  type DefenseSubCommittee,
  type SystemSettings,
} from "@/lib/types";
import { sub, isWithinInterval } from "date-fns";

export default function ReportSubmissionPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [activeRegistration, setActiveRegistration] =
    useState<DefenseRegistration | null>(null);
  const [activeSession, setActiveSession] =
    useState<GraduationDefenseSession | null>(null);
  const [subCommittee, setSubCommittee] = useState<DefenseSubCommittee | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, "users", user.uid) : null),
    [user, firestore]
  );
  const { data: userData } = useDoc<SystemUser>(userDocRef);

  const settingsDocRef = useMemoFirebase(
    () => doc(firestore, "systemSettings", "features"),
    [firestore]
  );
  const { data: settings } = useDoc<SystemSettings>(settingsDocRef);

  useEffect(() => {
    if (isUserLoading || !user) return;
    if (!isUserLoading && !user) router.push("/login");
    if (userData && userData.role !== "student") router.push("/");
  }, [user, userData, isUserLoading, router]);

  useEffect(() => {
    if (!user || !firestore) return; // Wait for settings to be loaded too

    const findActiveRegistration = async () => {
      setIsLoading(true);
      setSubCommittee(null);
      try {
        const ongoingSessionsQuery = query(
          collection(firestore, "graduationDefenseSessions"),
          where("status", "==", "ongoing"),
          where("sessionType", "in", ["graduation", "combined"]) // Only graduation-related sessions
        );
        const ongoingSessionsSnapshot = await getDocs(ongoingSessionsQuery);

        if (ongoingSessionsSnapshot.empty) {
          setActiveRegistration(null);
          setActiveSession(null);
          setIsLoading(false);
          return;
        }

        const sessionDoc = ongoingSessionsSnapshot.docs[0];
        const sessionData = {
          id: sessionDoc.id,
          ...sessionDoc.data(),
        } as GraduationDefenseSession;
        setActiveSession(sessionData);

        const registrationQuery = query(
          collection(firestore, "defenseRegistrations"),
          where("sessionId", "==", sessionData.id),
          where("studentDocId", "==", user.uid)
        );
        const registrationSnapshot = await getDocs(registrationQuery);

        if (!registrationSnapshot.empty) {
          const regDoc = registrationSnapshot.docs[0];
          const registrationData = {
            id: regDoc.id,
            ...regDoc.data(),
          } as DefenseRegistration;

          // Check if submission is allowed
          const toDate = (timestamp: any): Date | undefined =>
            timestamp?.toDate();
          const reportDate = toDate(sessionData.expectedReportDate);
          let isWindowOpen = false;
          if (reportDate) {
            const startDate = sub(reportDate, { weeks: 2 });
            const endDate = sub(reportDate, { weeks: 1 });
            isWindowOpen = isWithinInterval(new Date(), {
              start: startDate,
              end: endDate,
            });
          }

          if (
            registrationData.proposalStatus === "approved" &&
            (isWindowOpen || settings?.forceOpenReportSubmission)
          ) {
            setActiveRegistration(registrationData);
            if (registrationData.subCommitteeId) {
              const subCommitteeDocRef = doc(
                firestore,
                `graduationDefenseSessions/${registrationData.sessionId}/subCommittees`,
                registrationData.subCommitteeId
              );
              const subCommitteeDoc = await getDoc(subCommitteeDocRef);
              if (subCommitteeDoc.exists()) {
                setSubCommittee({
                  id: subCommitteeDoc.id,
                  ...subCommitteeDoc.data(),
                } as DefenseSubCommittee);
              }
            }
          } else {
            setActiveRegistration(null);
          }
        } else {
          setActiveRegistration(null);
        }
      } catch (error) {
        console.error("Error finding active registration:", error);
        setActiveRegistration(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Only run if settings have been loaded.
    if (settings !== undefined) {
      findActiveRegistration();
    }
  }, [user, firestore, settings]);

  if (isLoading || isUserLoading || !userData) {
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

  const getAlert = () => {
    if (!activeRegistration) {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Chưa đến thời gian nộp báo cáo</AlertTitle>
          <AlertDescription>
            Bạn hiện chưa thể nộp báo cáo. Vui lòng kiểm tra lại thời gian nộp
            bài hoặc đợi thông báo từ khoa.
          </AlertDescription>
        </Alert>
      );
    }
    const status = activeRegistration.reportStatus;

    if (status === "pending_approval") {
      return (
        <Alert variant="default" className="border-blue-500 text-blue-800">
          <FileUp className="h-4 w-4" />
          <AlertTitle>Đã nộp - Chờ duyệt</AlertTitle>
          <AlertDescription>
            Bạn đã nộp báo cáo thành công. Vui lòng chờ giáo viên hướng dẫn xem
            xét và duyệt.
          </AlertDescription>
        </Alert>
      );
    }
    if (status === "rejected") {
      return (
        <Alert variant="destructive">
          <FileSignature className="h-4 w-4" />
          <AlertTitle>Báo cáo bị từ chối</AlertTitle>
          <AlertDescription>
            Báo cáo của bạn đã bị từ chối. Vui lòng xem lại góp ý của giáo viên,
            chỉnh sửa và nộp lại.
          </AlertDescription>
        </Alert>
      );
    }
    if (status === "approved") {
      return (
        <Alert variant="default" className="border-green-500 text-green-800">
          <FileUp className="h-4 w-4" />
          <AlertTitle>Báo cáo đã được duyệt</AlertTitle>
          <AlertDescription>
            Chúc mừng! Báo cáo cuối kỳ của bạn đã được giáo viên hướng dẫn
            duyệt.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Nộp Báo cáo Đồ án Tốt nghiệp</CardTitle>
            <CardDescription>
              Cập nhật thông tin chi tiết về đề tài của bạn cho đợt báo cáo:{" "}
              <strong>{activeSession?.name || "..."}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {subCommittee && (
              <Alert className="mb-6">
                <Users className="h-4 w-4" />
                <AlertTitle>Thông tin Hội đồng</AlertTitle>
                <AlertDescription>
                  <p>
                    Bạn đã được phân vào tiểu ban:{" "}
                    <strong>{subCommittee.name}</strong>.
                  </p>
                  {subCommittee.description && (
                    <p>Ghi chú: {subCommittee.description}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {getAlert()}
            {activeRegistration && (
              <ReportSubmissionForm registration={activeRegistration} />
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
