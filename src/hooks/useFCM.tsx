import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { 
  requestNotificationPermission, 
  onForegroundMessage,
  isNotificationSupported,
  getNotificationPermission
} from '@/lib/firebase';
import { toast } from 'sonner';

export function useFCM() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    setIsSupported(isNotificationSupported());
    setPermission(getNotificationPermission());

    if (!user?.id || !isNotificationSupported()) return;

    // Request permission and register token
    const registerToken = async () => {
      try {
        const token = await requestNotificationPermission();
        
        if (token) {
          // Save token to user profile
          const { error } = await supabase
            .from('users')
            .update({ fcm_token: token })
            .eq('auth_user_id', user.id);

          if (error) {
            console.error('❌ Error saving FCM token:', error);
          } else {
            console.log('✅ FCM token saved to user profile');
            setPermission('granted');
          }
        }
      } catch (error) {
        console.error('❌ Error registering FCM token:', error);
      }
    };

    // Only register if permission is not denied
    const currentPermission = getNotificationPermission();
    if (currentPermission !== 'denied') {
      registerToken();
    }

    // Setup foreground message listener
    const unsubscribe = onForegroundMessage((payload) => {
      console.log('📨 Foreground notification:', payload);
      
      // Show toast for foreground notifications
      const title = payload.notification?.title || 'Nova Notificação';
      const body = payload.notification?.body || '';
      
      toast.success(title, {
        description: body,
        duration: 5000,
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id]);

  const requestPermission = async () => {
    if (!user?.id || !isNotificationSupported()) return false;

    try {
      const token = await requestNotificationPermission();
      
      if (token) {
        const { error } = await supabase
          .from('users')
          .update({ fcm_token: token })
          .eq('auth_user_id', user.id);

        if (!error) {
          setPermission('granted');
          toast.success('Notificações ativadas!', {
            description: 'Você receberá notificações push no navegador.',
          });
          return true;
        }
      }
      
      setPermission('denied');
      return false;
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      return false;
    }
  };

  return {
    permission,
    isSupported,
    requestPermission,
  };
}
