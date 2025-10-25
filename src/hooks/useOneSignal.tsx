import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

const ONESIGNAL_APP_ID = '566922a7-98de-4c80-bb1a-f17964f15d09';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

export function useOneSignal() {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const initStartedRef = useRef(false);

  useEffect(() => {
    // Só inicializar se tiver usuário logado, não estiver inicializado e não tiver começado a inicializar
    if (!user || isInitialized || initStartedRef.current) return;

    initStartedRef.current = true;

    const initOneSignal = async () => {
      try {
        console.log('🔔 Initializing OneSignal...');

        // Carregar SDK dinamicamente
        if (!window.OneSignal) {
          const script = document.createElement('script');
          script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
          script.defer = true;
          document.head.appendChild(script);

          // Aguardar carregamento
          await new Promise((resolve) => {
            script.onload = resolve;
          });
        }

        // Inicializar OneSignal
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async (OneSignal: any) => {
          // Verificar se já foi inicializado
          try {
            const alreadyInitialized = OneSignal.User?.PushSubscription?.id;
            if (alreadyInitialized) {
              console.log('⚠️ OneSignal already initialized, skipping...');
              setIsInitialized(true);
              return;
            }
          } catch (e) {
            // Não foi inicializado ainda, continuar
          }

          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            serviceWorkerPath: '/OneSignalSDKWorker.js',
            allowLocalhostAsSecureOrigin: true,
          });

          console.log('✅ OneSignal initialized');
          setIsInitialized(true);

          // Verificar se usuário já deu permissão
          const isPushSupported = OneSignal.Notifications.isPushSupported();
          if (!isPushSupported) {
            console.log('⚠️ Push notifications not supported on this browser');
            return;
          }

          const permission = OneSignal.Notifications.permission;
          console.log('📋 Current permission:', permission);

          // Se já tem permissão, capturar player_id
          if (permission === true) {
            const currentPlayerId = await OneSignal.User.PushSubscription.id;
            if (currentPlayerId) {
              console.log('📱 Player ID:', currentPlayerId);
              setPlayerId(currentPlayerId);
              await savePlayerIdToDatabase(currentPlayerId);
            }
          } else if (permission === false) {
            // Permissão bloqueada
            console.warn('❌ Notificações bloqueadas. Usuário precisa ativar manualmente nas configurações do navegador.');
          } else {
            // Solicitar permissão
            console.log('🔔 Requesting notification permission...');
            const result = await OneSignal.Notifications.requestPermission();
            
            if (result) {
              const newPlayerId = await OneSignal.User.PushSubscription.id;
              if (newPlayerId) {
                console.log('✅ Permission granted! Player ID:', newPlayerId);
                setPlayerId(newPlayerId);
                await savePlayerIdToDatabase(newPlayerId);
              }
            } else {
              console.log('❌ Permission denied');
            }
          }

          // Listener para mudanças no player_id
          OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
            const newPlayerId = event.current.id;
            if (newPlayerId) {
              console.log('🔄 Player ID changed:', newPlayerId);
              setPlayerId(newPlayerId);
              await savePlayerIdToDatabase(newPlayerId);
            }
          });
        });

      } catch (error) {
        console.error('❌ Error initializing OneSignal:', error);
        initStartedRef.current = false; // Resetar em caso de erro
      }
    };

    const savePlayerIdToDatabase = async (playerIdToSave: string) => {
      if (!user?.id) return;

      try {
        console.log('💾 Saving player_id to database...');
        
        const { error } = await supabase
          .from('users')
          .update({ onesignal_player_id: playerIdToSave })
          .eq('auth_user_id', user.id);

        if (error) {
          console.error('❌ Error saving player_id:', error);
        } else {
          console.log('✅ Player ID saved to database');
        }
      } catch (error) {
        console.error('❌ Error saving player_id:', error);
      }
    };

    initOneSignal();
  }, [user, isInitialized]);

  return { isInitialized, playerId };
}
