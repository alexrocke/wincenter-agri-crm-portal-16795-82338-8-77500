import { useEffect, useState } from 'react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Bell, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function NotificationPermissionBanner() {
  const { isInitialized, initError, requestPermission } = useOneSignal();
  const [dismissed, setDismissed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success('Notificações ativadas com sucesso!');
      setDismissed(true);
    } else {
      toast.error('Permissão negada. Ative nas configurações do navegador.');
    }
  };

  if (dismissed || permission === 'granted') {
    return null;
  }

  // Mostrar erro de domínio
  if (initError) {
    return (
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-start justify-between gap-2">
            <div className="flex-1 text-sm">
              <p className="font-semibold mb-1">Erro de Configuração</p>
              <p>{initError}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Mostrar banner para pedir permissão
  if (isInitialized && permission === 'default') {
    return (
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50">
        <Alert className="bg-primary/10 border-primary">
          <Bell className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <p className="font-semibold mb-1">Ativar notificações</p>
              <p className="text-sm text-muted-foreground mb-2">
                Receba atualizações importantes do sistema
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleRequestPermission}
                >
                  Ativar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDismissed(true)}
                >
                  Agora não
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}
