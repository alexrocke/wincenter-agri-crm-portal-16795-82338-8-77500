import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useFCM } from '@/hooks/useFCM';
import { useState } from 'react';

export function NotificationPermissionBanner() {
  const { permission, isSupported, requestPermission } = useFCM();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if:
  // - Not supported
  // - Already granted
  // - Explicitly denied
  // - User dismissed
  if (!isSupported || permission === 'granted' || permission === 'denied' || dismissed) {
    return null;
  }

  const handleRequest = async () => {
    const granted = await requestPermission();
    if (!granted) {
      setDismissed(true);
    }
  };

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 shadow-lg border-primary/20 bg-card z-50">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 p-2 rounded-full">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-sm">Ativar Notificações Push</h3>
          <p className="text-xs text-muted-foreground">
            Receba notificações instantâneas sobre vendas, tarefas e atualizações importantes.
          </p>
          
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={handleRequest}
              size="sm"
              className="flex-1"
            >
              Ativar
            </Button>
            <Button 
              onClick={() => setDismissed(true)}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              Agora não
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
