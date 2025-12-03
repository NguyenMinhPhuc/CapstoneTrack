"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { MyCompanyManagementTable } from "@/components/my-company-management-table";
import { MyCompanyStudentsTable } from "@/components/my-company-students-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Supervisor } from "@/lib/types";

export default function InternshipCompanyManagementPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, "users", user.uid) : null),
    [firestore, user]
  );
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const supervisorDocRef = useMemoFirebase(() => {
    if (!user || !userData || userData.role !== "supervisor") return null;
    return doc(firestore, "supervisors", user.uid);
  }, [firestore, user, userData]);
  const { data: supervisorData, isLoading: isSupervisorLoading } =
    useDoc<Supervisor>(supervisorDocRef);

  useEffect(() => {
    const loading = isUserLoading || isUserDataLoading || isSupervisorLoading;
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!userData) return;
    if (userData.role !== "supervisor" && userData.role !== "admin") {
      router.push("/");
    }
  }, [
    user,
    userData,
    isUserLoading,
    isUserDataLoading,
    isSupervisorLoading,
    router,
  ]);

  const overallLoading =
    isUserLoading || isUserDataLoading || isSupervisorLoading;

  if (overallLoading || !user || !userData) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-10 w-1/3 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  const supervisorName = supervisorData
    ? `${supervisorData.firstName} ${supervisorData.lastName}`
    : userData.displayName || "Giáo viên";

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl font-bold">Đơn vị thực tập của tôi</h1>
      <p className="text-sm text-muted-foreground">
        Quản lý các đơn vị thực tập và xem danh sách sinh viên đăng ký.
      </p>

      <Tabs defaultValue="companies" className="w-full">
        <TabsList className="grid w-full sm:w-auto grid-cols-2">
          <TabsTrigger value="companies">Đơn vị</TabsTrigger>
          <TabsTrigger value="students">Sinh viên đăng ký</TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Thêm, chỉnh sửa hoặc xóa các đơn vị thực tập mà bạn trực tiếp quản
            lý. Các đơn vị này sẽ xuất hiện cho sinh viên khi đăng ký thực tập
            nếu được gán vào đợt.
          </p>
          <MyCompanyManagementTable
            supervisorId={user.uid}
            supervisorName={supervisorName}
            isAdmin={userData.role === "admin"}
          />
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <MyCompanyStudentsTable supervisorId={user.uid} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
