import { ReactNode } from 'react';
import { SimplifiedHeader } from './SimplifiedHeader';
import { SimplifiedBottomNav } from './SimplifiedBottomNav';

interface SimplifiedLayoutProps {
  children: ReactNode;
}

export function SimplifiedLayout({ children }: SimplifiedLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <SimplifiedHeader />
      
      <main className="flex-1 overflow-y-auto pt-14 pb-20">
        <div className="container max-w-screen-sm mx-auto px-4 py-4">
          {children}
        </div>
      </main>

      <SimplifiedBottomNav />
    </div>
  );
}
