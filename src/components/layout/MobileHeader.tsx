import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { LogOut, Menu, Zap, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { SidebarContent } from './SidebarContent';
import { useSimplifiedMode } from '@/hooks/useSimplifiedMode';
import { ThemeToggle } from '@/components/ThemeToggle';

export function MobileHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { isSimplified, toggleMode, canUseSimplified } = useSimplifiedMode();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleToggle = () => {
    toggleMode();
    if (isSimplified) {
      navigate('/seller/dashboard');
    } else {
      navigate('/seller/simple/dashboard');
    }
  };

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
      <div className="flex items-center justify-between h-16 px-4">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
            <SheetDescription className="sr-only">
              Navegue pelas diferentes seções do WinCenter
            </SheetDescription>
            <SidebarContent onNavigate={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
          <img 
            src="/logo.png" 
            alt="WinCenter" 
            className="h-10 w-auto object-contain"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-primary">WinCenter</span>
            {isSimplified && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Modo Rápido
              </span>
            )}
            {!isSimplified && (
              <span className="text-xs text-muted-foreground">Agriculture</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {canUseSimplified && (
            <Button
              variant={isSimplified ? "default" : "ghost"}
              size="sm"
              onClick={handleToggle}
              className="h-8 w-8 p-0"
            >
              {isSimplified ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
            </Button>
          )}
          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-9 w-9"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
