'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </FirebaseClientProvider>
  );
}
