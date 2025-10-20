
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  GraduationCap,
  Briefcase,
  Shield,
  Calendar,
  UserSquare,
  ClipboardCheck,
  ChevronDown,
  FileUp,
  UserCheck,
  BookCheck,
  Package,
  BookUser,
  BookMarked,
  BookA,
  FileSignature,
  Activity,
  Building,
} from "lucide-react";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Button } from "./ui/button";

export function AppSidebar() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const isActive = (href: string) => {
    if (href === '/') {
        return pathname === href;
    }
    return pathname.startsWith(href);
  }

  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading) {
      return (
          <Sidebar variant="inset" collapsible="icon">
              <SidebarHeader>
                 <SidebarGroup className="p-0">
                    <SidebarMenuButton asChild size="lg" className="group-data-[collapsible=icon]:!p-2">
                        <Link href="/"><GraduationCap className="text-primary" /><span className="font-headline font-semibold text-lg">CapstoneTrack</span></Link>
                    </SidebarMenuButton>
                </SidebarGroup>
              </SidebarHeader>
              <SidebarContent>
                  <div className="p-2 space-y-2">
                      {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
              </SidebarContent>
          </Sidebar>
      )
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarGroup className="p-0">
          <SidebarMenuButton
            asChild
            size="lg"
            className="group-data-[collapsible=icon]:!p-2"
          >
            <Link href="/">
              <GraduationCap className="text-primary" />
              <span className="font-headline font-semibold text-lg">
                CapstoneTrack
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarGroup>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/")} tooltip="Dashboard">
                    <Link href="/"><LayoutDashboard /><span>Dashboard</span></Link>
                </SidebarMenuButton>
            </SidebarMenuItem>

            {userData?.role === 'student' && (
              <>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/topic-registration")} tooltip="Đăng ký Đề tài">
                        <Link href="/topic-registration"><BookMarked /><span>Đăng ký Đề tài</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/proposal-submission")} tooltip="Nộp thuyết minh">
                        <Link href="/proposal-submission"><FileSignature /><span>Nộp Thuyết minh</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/progress-report")} tooltip="Báo cáo Tiến độ">
                        <Link href="/progress-report"><Activity /><span>Báo cáo Tiến độ</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/report-submission")} tooltip="Nộp báo cáo">
                        <Link href="/report-submission"><FileUp /><span>Nộp báo cáo</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/internship-submission")} tooltip="Nộp hồ sơ thực tập">
                        <Link href="/internship-submission"><Briefcase /><span>Nộp hồ sơ thực tập</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
            
            {(userData?.role === 'supervisor' || userData?.role === 'admin') && (
              <>
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/my-topics")} tooltip="Đề tài của tôi">
                        <Link href="/my-topics"><BookUser /><span>Đề tài của tôi</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/supervisor-grading")} tooltip="Chấm điểm Hướng dẫn">
                        <Link href="/supervisor-grading"><UserCheck /><span>Chấm điểm Hướng dẫn</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/council-grading")} tooltip="Chấm điểm Hội đồng">
                        <Link href="/council-grading"><ClipboardCheck /><span>Chấm điểm Hội đồng</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}

            <div className="px-2 py-2"><SidebarSeparator /></div>
            
             {userData?.role === 'admin' && (
                <>
                 <Collapsible asChild defaultOpen>
                    <SidebarGroup>
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between w-full">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-data-[collapsible=icon]:hidden px-2">Quản lý chung</p>
                                <Button variant="ghost" size="icon" className="h-6 w-6 group-data-[collapsible=icon]:hidden">
                                     <ChevronDown className="h-4 w-4" />
                                </Button>
                            </div>
                        </CollapsibleTrigger>
                         <CollapsibleContent asChild>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("/admin/defense-sessions")} tooltip="Defense Sessions">
                                        <Link href="/admin/defense-sessions"><Calendar /><span>Quản lý Đợt báo cáo</span></Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                 <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("/admin/topics")} tooltip="Topic Management">
                                        <Link href="/admin/topics"><BookA /><span>Quản lý Đề tài</span></Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                 <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("/admin/rubrics")} tooltip="Rubric Management">
                                        <Link href="/admin/rubrics"><ClipboardCheck /><span>Quản lý Rubric</span></Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                 <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("/admin/grade-reports")} tooltip="Grade Reports">
                                        <Link href="/admin/grade-reports"><BookCheck /><span>Bảng điểm</span></Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                 <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("/admin/submission-reports")} tooltip="Submission Reports">
                                        <Link href="/admin/submission-reports"><Package /><span>Hồ sơ đã nộp</span></Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("/admin/students")} tooltip="Student Management">
                                        <Link href="/admin/students"><Users /><span>Quản lý Sinh viên</span></Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                 <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("/admin/supervisors")} tooltip="Supervisor Management">
                                        <Link href="/admin/supervisors"><UserSquare /><span>Quản lý GVHD</span></Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("/admin/users")} tooltip="User Management">
                                        <Link href="/admin/users"><Shield /><span>Quản lý Tài khoản</span></Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("/admin/settings")} tooltip="Settings">
                                        <Link href="/admin/settings"><Settings /><span>Cài đặt hệ thống</span></Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                         </CollapsibleContent>
                    </SidebarGroup>
                 </Collapsible>
                 <Collapsible asChild defaultOpen>
                    <SidebarGroup>
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between w-full">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-data-[collapsible=icon]:hidden px-2">Quản lý Thực tập</p>
                                <Button variant="ghost" size="icon" className="h-6 w-6 group-data-[collapsible=icon]:hidden">
                                     <ChevronDown className="h-4 w-4" />
                                </Button>
                            </div>
                        </CollapsibleTrigger>
                         <CollapsibleContent asChild>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("/admin/companies")} tooltip="Company Management">
                                        <Link href="/admin/companies"><Building /><span>Quản lý Doanh nghiệp</span></Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                         </CollapsibleContent>
                    </SidebarGroup>
                 </Collapsible>
                 <div className="px-2 py-2"><SidebarSeparator /></div>
                </>
             )}
            
            <div className="flex-1" />

            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Settings">
                    <Link href="#"><Settings /><span>Settings</span></Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
