import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

export function NotificationPermissionBanner() {
  const [show, setShow] = useState(false);
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>('default');

  useEffect(() => {
    // Verificar permissão de notificação
    if ('Notification' in window) {
      setPermission(Notification.permission as any);
      
      // Mostrar banner apenas se permissão não foi concedida e não foi negada permanentemente
      if (Notification.permission === 'default') {
        // Esperar 3 segundos antes de mostrar o banner
        const timer = setTimeout(() => {
          setShow(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleRequestPermission = () => {
    if ('OneSignalDeferred' in window) {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        try {
          await OneSignal.Slidedown.promptPush();
          // Atualizar estado após solicitar
          setTimeout(() => {
            if ('Notification' in window) {
              setPermission(Notification.permission as any);
              if (Notification.permission !== 'default') {
                setShow(false);
              }
            }
          }, 1000);
        } catch (error) {
          console.error('Error requesting notification permission:', error);
        }
      });
    }
  };

  const handleDismiss = () => {
    setShow(false);
    // Guardar no localStorage que o usuário fechou
    localStorage.setItem('notification-banner-dismissed', 'true');
  };

  // Não mostrar se já foi dispensado
  useEffect(() => {
    const dismissed = localStorage.getItem('notification-banner-dismissed');
    if (dismissed === 'true') {
      setShow(false);
    }
  }, []);

  if (!show || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-4">
      <Card className="p-4 shadow-lg border-2 border-primary">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold mb-1">Receba Notificações</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Ative as notificações push para receber atualizações importantes mesmo quando o app estiver fechado.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleRequestPermission}>
                Ativar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Agora não
              </Button>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
