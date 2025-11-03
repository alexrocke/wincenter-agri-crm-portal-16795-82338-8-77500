import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { MobileHeader } from './MobileHeader';
import { NotificationPermissionBanner } from '@/components/NotificationPermissionBanner';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop: Sidebar */}
      <div className="hidden md:flex">
        <AdminSidebar />
      </div>

      {/* Mobile: Header with Menu */}
      <MobileHeader />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="pt-16 md:pt-0 pb-4 md:pb-0">
          {children}
        </div>
      </main>

      <NotificationPermissionBanner />
    </div>
  );
}
