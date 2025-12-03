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
import { Info, FileSignature } from "lucide-react";
import { ProposalSubmissionForm } from "@/components/proposal-submission-form";
import {
  type DefenseRegistration,
  type GraduationDefenseSession,
  type SystemUser,
  type DefenseSubCommittee,
  type SystemSettings,
} from "@/lib/types";

export default function ProposalSubmissionPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [activeRegistration, setActiveRegistration] =
    useState<DefenseRegistration | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [isLoadingRegistration, setIsLoadingRegistration] = useState(true);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, "users", user.uid) : null),
    [user, firestore]
  );
  const { data: userData, isLoading: isUserDataLoading } =
    useDoc<SystemUser>(userDocRef);

  const settingsDocRef = useMemoFirebase(
    () => doc(firestore, "systemSettings", "features"),
    [firestore]
  );
  const { data: settings, isLoading: isLoadingSettings } =
    useDoc<SystemSettings>(settingsDocRef);

  useEffect(() => {
    const isLoading = isUserLoading || isUserDataLoading;
    if (isLoading) return;

    if (!user) {
      router.push("/login");
    } else if (userData && userData.role !== "student") {
      router.push("/");
    }
  }, [user, userData, isUserLoading, isUserDataLoading, router]);

  useEffect(() => {
    if (!user || !firestore) return;

    const findActiveRegistration = async () => {
      setIsLoadingRegistration(true);
      try {
        const sessionsQuery = query(
          collection(firestore, "graduationDefenseSessions"),
          where("status", "in", ["upcoming", "ongoing"]),
          where("sessionType", "in", ["graduation", "combined"]) // Only graduation-related sessions
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);

        if (sessionsSnapshot.empty) {
          setActiveRegistration(null);
          setSessionName("");
          setIsLoadingRegistration(false);
          return;
        }

        const sessionsData = sessionsSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as GraduationDefenseSession)
        );
        const sessionToSearch =
          sessionsData.find((s) => s.status === "ongoing") ||
          sessionsData.find((s) => s.status === "upcoming") ||
          null;

        if (!sessionToSearch) {
          setActiveRegistration(null);
          setSessionName("");
          setIsLoadingRegistration(false);
          return;
        }

        const registrationQuery = query(
          collection(firestore, "defenseRegistrations"),
          where("sessionId", "==", sessionToSearch.id),
          where("studentDocId", "==", user.uid)
        );
        const registrationSnapshot = await getDocs(registrationQuery);

        if (!registrationSnapshot.empty) {
          const regDoc = registrationSnapshot.docs[0];
          const registrationData = {
            id: regDoc.id,
            ...regDoc.data(),
          } as DefenseRegistration;

          if (registrationData.projectRegistrationStatus === "approved") {
            setActiveRegistration(registrationData);
            setSessionName(sessionToSearch.name);
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
        setIsLoadingRegistration(false);
      }
    };

    findActiveRegistration();
  }, [user, firestore]);

  const isLoading =
    isUserLoading ||
    isUserDataLoading ||
    isLoadingRegistration ||
    isLoadingSettings;

  if (isLoading || !user || !userData) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
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
        </div>
      </main>
    );
  }

  const getAlert = () => {
    if (!activeRegistration) {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Chưa thể nộp thuyết minh</AlertTitle>
          <AlertDescription>
            Bạn cần đăng ký đề tài và được giáo viên hướng dẫn xác nhận trước
            khi có thể nộp thuyết minh.
          </AlertDescription>
        </Alert>
      );
    }
    if (activeRegistration.proposalStatus === "pending_approval") {
      return (
        <Alert variant="default" className="border-blue-500 text-blue-800">
          <FileSignature className="h-4 w-4" />
          <AlertTitle>Đã nộp - Chờ duyệt</AlertTitle>
          <AlertDescription>
            Bạn đã nộp thuyết minh thành công. Vui lòng chờ giáo viên hướng dẫn
            xem xét và duyệt. Bạn vẫn có thể cập nhật lại thông tin nếu cần.
          </AlertDescription>
        </Alert>
      );
    }
    if (activeRegistration.proposalStatus === "rejected") {
      return (
        <Alert variant="destructive">
          <FileSignature className="h-4 w-4" />
          <AlertTitle>Thuyết minh bị từ chối</AlertTitle>
          <AlertDescription>
            Thuyết minh của bạn đã bị từ chối. Vui lòng xem lại góp ý của giáo
            viên, chỉnh sửa và nộp lại.
          </AlertDescription>
        </Alert>
      );
    }
    if (activeRegistration.proposalStatus === "approved") {
      return (
        <Alert variant="default" className="border-green-500 text-green-800">
          <FileSignature className="h-4 w-4" />
          <AlertTitle>Thuyết minh đã được duyệt</AlertTitle>
          <AlertDescription>
            Chúc mừng! Thuyết minh của bạn đã được giáo viên hướng dẫn duyệt.
            {settings?.allowEditingApprovedProposal &&
              " Tuy nhiên, admin đang cho phép chỉnh sửa lại, bạn có thể cập nhật nếu cần."}
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
            <CardTitle>Nộp Thuyết minh Đề tài</CardTitle>
            <CardDescription>
              Cập nhật chi tiết về đề tài bạn đã đăng ký cho đợt:{" "}
              <strong>{sessionName || "..."}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {getAlert()}
              {activeRegistration && (
                <ProposalSubmissionForm
                  registration={activeRegistration}
                  allowEditingApproved={
                    settings?.allowEditingApprovedProposal ?? false
                  }
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
