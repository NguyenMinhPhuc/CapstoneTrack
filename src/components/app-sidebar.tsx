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
  BarChart3,
  Settings,
  GraduationCap,
  Briefcase,
  Shield,
  Calendar,
} from "lucide-react";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";

export function AppSidebar() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const menuItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { type: "separator", label: "Internship" },
    { href: "/internship/applications", label: "Applications", icon: Briefcase },
    { href: "/internship/reports", label: "Reports", icon: BarChart3 },
    { type: "separator", label: "Graduation" },
    { href: "/graduation/projects", label: "Projects", icon: FileText },
    { href: "/graduation/reports", label: "Reports", icon: BarChart3 },
    { type: "separator" },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const adminMenuItems = [
    { type: "separator", label: "Admin" },
    { href: "/admin/users", label: "User Management", icon: Shield },
    { href: "/admin/students", label: "Student Management", icon: Users },
    { href: "/admin/defense-sessions", label: "Defense Sessions", icon: Calendar },
  ];
  
  const allItems = [...menuItems];
  if (userData?.role === 'admin') {
    allItems.splice(7, 0, ...adminMenuItems);
  }

  const isLoading = isUserLoading || isUserDataLoading;

  const isActive = (href: string) => {
    if (href === '/') {
        return pathname === href;
    }
    return pathname.startsWith(href);
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
        {isLoading ? (
            <div className="p-2 space-y-2">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
        ) : (
            <SidebarMenu>
            {allItems.map((item, index) => {
                if (item.type === 'separator') {
                return (
                    <div key={index} className="px-4 py-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-data-[collapsible=icon]:hidden">{item.label}</p>
                    <SidebarSeparator className="group-data-[collapsible=icon]:block hidden my-2"/>
                    </div>
                );
                }
                return (
                <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                    >
                    <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                    </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                )
            })}
            </SidebarMenu>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
