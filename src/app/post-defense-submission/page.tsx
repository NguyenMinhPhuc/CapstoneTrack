"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useUser,
  useDoc,
  useFirestore,
  useMemoFirebase,
  FirestorePermissionError,
  errorEmitter,
} from "@/firebase";
import {
  doc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
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
import { Info, FileUp, Link as LinkIcon, CheckCircle } from "lucide-react";
import {
  type DefenseRegistration,
  type GraduationDefenseSession,
  type SystemUser,
  type SystemSettings,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export default function PostDefenseSubmissionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [activeRegistration, setActiveRegistration] =
    useState<DefenseRegistration | null>(null);
  const [activeSession, setActiveSession] =
    useState<GraduationDefenseSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submissionLink, setSubmissionLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const isFeatureEnabled = settings?.enablePostDefenseSubmission ?? false;

  useEffect(() => {
    if (isUserLoading || isUserDataLoading) {
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    if (userData && userData.role !== "student") {
      router.push("/");
    }
  }, [user, isUserLoading, userData, isUserDataLoading, router]);

  useEffect(() => {
    if (!user || !firestore) {
      setIsLoading(false);
      return;
    }

    const findActiveRegistration = async () => {
      setIsLoading(true);
      try {
        const ongoingSessionsQuery = query(
          collection(firestore, "graduationDefenseSessions"),
          where("status", "==", "ongoing"),
          where("sessionType", "in", ["graduation", "combined"]) // Only graduation-related sessions
        );
        const ongoingSessionsSnapshot = await getDocs(ongoingSessionsQuery);

        if (ongoingSessionsSnapshot.empty) {
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

          // Only set active registration if the report has been approved
          if (registrationData.reportStatus === "approved") {
            setActiveRegistration(registrationData);
            setSubmissionLink(registrationData.postDefenseReportLink || "");
          }
        }
      } catch (error) {
        console.error("Error finding active registration:", error);
      } finally {
        setIsLoading(false);
      }
    };
    findActiveRegistration();
  }, [user, firestore]);

  const handleSubmit = async () => {
    if (!activeRegistration) return;
    setIsSubmitting(true);
    const regDocRef = doc(
      firestore,
      "defenseRegistrations",
      activeRegistration.id
    );
    try {
      await updateDoc(regDocRef, { postDefenseReportLink: submissionLink });
      toast({
        title: "Thành công",
        description: "Đã cập nhật link báo cáo sau hội đồng.",
      });
    } catch (error) {
      const contextualError = new FirestorePermissionError({
        path: regDocRef.path,
        operation: "update",
        requestResourceData: { postDefenseReportLink: submissionLink },
      });
      errorEmitter.emit("permission-error", contextualError);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể cập nhật link.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPageLoading =
    isLoading || isUserLoading || isLoadingSettings || isUserDataLoading;

  if (isPageLoading) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </main>
    );
  }

  const showMainContent =
    isFeatureEnabled && activeSession?.postDefenseSubmissionLink;

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp /> Nộp báo cáo sau Hội đồng
            </CardTitle>
            <CardDescription>
              Hoàn thiện báo cáo theo góp ý của Hội đồng và nộp lại tại đây. Đợt
              báo cáo: <strong>{activeSession?.name || "..."}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!showMainContent ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Chưa đến thời gian nộp</AlertTitle>
                <AlertDescription>
                  Hiện tại chưa có link nộp báo cáo sau hội đồng hoặc tính năng
                  này đang được khóa bởi admin. Vui lòng quay lại sau.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {activeSession.postDefenseSubmissionDescription && (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h3 className="font-semibold mb-2">Yêu cầu từ Khoa</h3>
                    <div
                      className={cn(
                        "prose prose-sm max-w-none text-muted-foreground",
                        "[&_ul]:list-disc [&_ul]:pl-4",
                        "[&_ol]:list-decimal [&_ol]:pl-4"
                      )}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {activeSession.postDefenseSubmissionDescription}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                <div className="text-sm">
                  <Label>Link nộp bài chung của Khoa</Label>
                  <a
                    href={activeSession.postDefenseSubmissionLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-semibold flex items-center gap-1.5 mt-1"
                  >
                    <LinkIcon className="inline h-4 w-4" />{" "}
                    {activeSession.postDefenseSubmissionLink}
                  </a>
                  <p className="text-muted-foreground mt-1">
                    Vui lòng truy cập link trên để nộp bài theo yêu cầu và dán
                    lại link đã nộp vào ô bên dưới để Khoa lưu trữ.
                  </p>
                </div>

                {activeRegistration ? (
                  <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="submission-link" className="font-semibold">
                      Link báo cáo hoàn chỉnh của bạn
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="submission-link"
                        value={submissionLink}
                        onChange={(e) => setSubmissionLink(e.target.value)}
                        placeholder="https://docs.google.com/..."
                      />
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !submissionLink}
                      >
                        {isSubmitting ? "Đang lưu..." : "Lưu"}
                      </Button>
                    </div>
                    {activeRegistration.postDefenseReportLink && (
                      <Alert
                        variant="default"
                        className="border-green-500 text-green-800 dark:text-green-300 mt-4"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>Đã nộp thành công</AlertTitle>
                        <AlertDescription>
                          Bạn đã nộp link báo cáo. Bạn vẫn có thể cập nhật lại
                          nếu cần.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Chưa đủ điều kiện nộp</AlertTitle>
                    <AlertDescription>
                      Bạn cần có báo cáo được duyệt trong đợt này để có thể nộp
                      link báo cáo sau hội đồng.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
