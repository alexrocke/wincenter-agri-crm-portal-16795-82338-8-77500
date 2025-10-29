import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const ONESIGNAL_APP_ID = '78a7d0aa-6f16-45db-aed0-1730a713894e';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

export function useOneSignal() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Carregar script OneSignal
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    document.head.appendChild(script);

    // Configurar OneSignal quando carregado
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        safari_web_id: 'web.onesignal.auto.8f6b47d5-09e9-43c6-bccf-31f0c3e5c3c3',
        notifyButton: {
          enable: false,
        },
        allowLocalhostAsSecureOrigin: true,
      });

      // Listener para quando o player_id estiver disponível
      OneSignal.User.PushSubscription.addEventListener('change', async (subscription: any) => {
        if (subscription.current.id) {
          const playerId = subscription.current.id;
          console.log('OneSignal Player ID:', playerId);

          // Salvar player_id no banco
          try {
            const { error } = await supabase
              .from('users')
              .update({ onesignal_player_id: playerId })
              .eq('auth_user_id', user.id);

            if (error) {
              console.error('Error saving OneSignal player ID:', error);
            } else {
              console.log('OneSignal player ID saved successfully');
            }
          } catch (err) {
            console.error('Error updating user:', err);
          }
        }
      });

      // Listener para notificações recebidas
      OneSignal.Notifications.addEventListener('click', (event: any) => {
        console.log('Notification clicked:', event);
        const data = event.notification.additionalData;
        
        // Redirecionar para página de notificações
        if (data?.notification_id) {
          window.location.href = '/notifications';
        }
      });
    });

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [user?.id]);
}
