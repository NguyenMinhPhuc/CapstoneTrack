"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useUser,
  useDoc,
  useFirestore,
  useMemoFirebase,
  errorEmitter,
  FirestorePermissionError,
} from "@/firebase";
import {
  doc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
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
import { Info, BookMarked } from "lucide-react";
import {
  type DefenseRegistration,
  type GraduationDefenseSession,
  type SystemUser,
  type ProjectTopic,
} from "@/lib/types";
import { TopicRegistrationList } from "@/components/topic-registration-list";
import { RegisteredTopicDetails } from "@/components/registered-topic-details";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function TopicRegistrationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [activeRegistration, setActiveRegistration] =
    useState<DefenseRegistration | null>(null);
  const [activeSession, setActiveSession] =
    useState<GraduationDefenseSession | null>(null);
  const [registeredTopic, setRegisteredTopic] = useState<ProjectTopic | null>(
    null
  );
  const [isLoadingRegistration, setIsLoadingRegistration] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, "users", user.uid) : null),
    [user, firestore]
  );
  const { data: userData, isLoading: isUserDataLoading } =
    useDoc<SystemUser>(userDocRef);

  useEffect(() => {
    const isLoading = isUserLoading || isUserDataLoading;
    if (isLoading) return;

    if (!user) {
      router.push("/login");
    } else if (userData && userData.role !== "student") {
      router.push("/");
    }
  }, [user, userData, isUserLoading, isUserDataLoading, router]);

  const fetchActiveRegistration = async () => {
    if (!user || !firestore) return;

    setIsLoadingRegistration(true);
    setRegisteredTopic(null); // Reset topic on re-fetch
    try {
      const sessionsQuery = query(
        collection(firestore, "graduationDefenseSessions"),
        where("status", "in", ["upcoming", "ongoing"]),
        where("sessionType", "in", ["graduation", "combined"]) // Only graduation-related sessions
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);

      if (sessionsSnapshot.empty) {
        setActiveRegistration(null);
        setActiveSession(null);
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
        setActiveSession(null);
        setIsLoadingRegistration(false);
        return;
      }

      setActiveSession(sessionToSearch);

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
        setActiveRegistration(registrationData);

        if (registrationData.projectTitle) {
          const topicQuery = query(
            collection(firestore, "projectTopics"),
            where("sessionId", "==", sessionToSearch.id),
            where("title", "==", registrationData.projectTitle),
            where("supervisorId", "==", registrationData.supervisorId)
          );
          const topicSnapshot = await getDocs(topicQuery);
          if (!topicSnapshot.empty) {
            const topicDoc = topicSnapshot.docs[0];
            setRegisteredTopic({
              id: topicDoc.id,
              ...topicDoc.data(),
            } as ProjectTopic);
          }
        }
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

  useEffect(() => {
    fetchActiveRegistration();
  }, [user, firestore]);

  const handleCancelRegistration = async () => {
    if (!activeRegistration || !registeredTopic) return;

    setIsCancelling(true);
    const batch = writeBatch(firestore);

    // 1. Reset the student's registration document
    const registrationRef = doc(
      firestore,
      "defenseRegistrations",
      activeRegistration.id
    );
    batch.update(registrationRef, {
      projectTitle: "",
      summary: "",
      objectives: "",
      expectedResults: "",
      supervisorId: "",
      supervisorName: "",
      projectRegistrationStatus: null, // Reset status
    });

    // 2. If the topic was full, open it up again
    if (registeredTopic.status === "taken") {
      const topicRef = doc(firestore, "projectTopics", registeredTopic.id);
      batch.update(topicRef, { status: "approved" });
    }

    try {
      await batch.commit();
      toast({
        title: "Hủy đăng ký thành công!",
        description: "Bạn có thể chọn một đề tài khác.",
      });
      // Refetch data to update UI
      fetchActiveRegistration();
    } catch (error) {
      console.error("Error cancelling registration:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể hủy đăng ký. Vui lòng thử lại.",
      });
      const contextualError = new FirestorePermissionError({
        path: `batch write on topic ${registeredTopic.id} and registration ${activeRegistration.id}`,
        operation: "update",
      });
      errorEmitter.emit("permission-error", contextualError);
    } finally {
      setIsCancelling(false);
    }
  };

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

  const canStudentCancel =
    !activeRegistration?.projectRegistrationStatus ||
    activeRegistration.projectRegistrationStatus === "pending";

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
              Xem danh sách các đề tài có sẵn và đăng ký cho đợt:{" "}
              <strong>{activeSession?.name || "..."}</strong>
            </CardDescription>
          </CardHeader>
        </Card>

        {!activeSession && !isLoading && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Chưa có đợt báo cáo nào</AlertTitle>
            <AlertDescription>
              Hiện tại chưa có đợt báo cáo nào đang hoặc sắp diễn ra. Vui lòng
              quay lại sau.
            </AlertDescription>
          </Alert>
        )}

        {activeSession && !activeRegistration && !isLoading && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Chưa được thêm vào đợt</AlertTitle>
            <AlertDescription>
              Bạn chưa được thêm vào đợt báo cáo{" "}
              <span className="font-semibold">{activeSession.name}</span>. Vui
              lòng liên hệ quản trị viên.
            </AlertDescription>
          </Alert>
        )}

        {activeSession &&
          activeRegistration &&
          (activeRegistration.projectTitle && registeredTopic ? (
            <div>
              <RegisteredTopicDetails
                topic={registeredTopic}
                registration={activeRegistration}
                session={activeSession}
              />
              {canStudentCancel && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="mt-4 w-full sm:w-auto"
                      disabled={isCancelling}
                    >
                      {isCancelling ? "Đang hủy..." : "Hủy đăng ký"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xác nhận hủy đăng ký?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Bạn có chắc chắn muốn hủy đăng ký đề tài{" "}
                        <span className="font-bold">
                          "{registeredTopic.title}"
                        </span>
                        ?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Không</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelRegistration}>
                        Xác nhận hủy
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ) : (
            <TopicRegistrationList
              session={activeSession}
              registration={activeRegistration}
              onRegistrationSuccess={fetchActiveRegistration}
            />
          ))}
      </div>
    </main>
  );
}
