import { useSimplifiedMode } from '@/hooks/useSimplifiedMode';
import { Button } from '@/components/ui/button';
import { Zap, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';

export function SimplifiedHeader() {
  const { isSimplified, toggleMode, canUseSimplified } = useSimplifiedMode();
  const navigate = useNavigate();

  const handleToggle = () => {
    toggleMode();
    if (isSimplified) {
      navigate('/seller/dashboard');
    } else {
      navigate('/seller/simple/dashboard');
    }
  };

  if (!canUseSimplified) return null;

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <img 
            src="/logo.png" 
            alt="WinCenter" 
            className="h-8 w-auto object-contain"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-primary">WinCenter</span>
            {isSimplified && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Modo Rápido
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant={isSimplified ? "default" : "outline"}
            size="sm"
            onClick={handleToggle}
            className="h-9 gap-2"
          >
            {isSimplified ? (
              <>
                <Maximize2 className="h-4 w-4" />
                <span className="text-xs">Completo</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span className="text-xs">Rápido</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
