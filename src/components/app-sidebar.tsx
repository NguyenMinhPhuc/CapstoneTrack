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
} from "lucide-react";

const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { type: "separator", label: "Internship" },
  { href: "/internship/applications", label: "Applications", icon: Briefcase },
  { href: "/internship/students", label: "Students", icon: Users },
  { href: "/internship/reports", label: "Reports", icon: BarChart3 },
  { type: "separator", label: "Graduation" },
  { href: "/graduation/projects", label: "Projects", icon: FileText },
  { href: "/graduation/students", label: "Students", icon: Users },
  { href: "/graduation/reports", label: "Reports", icon: BarChart3 },
  { type: "separator" },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

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
          {menuItems.map((item, index) => {
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
                  isActive={pathname === item.href}
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
      </SidebarContent>
    </Sidebar>
  );
}
