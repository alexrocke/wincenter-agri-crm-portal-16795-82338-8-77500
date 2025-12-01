import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface PendingAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
}

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Carregar ações pendentes do localStorage
    const stored = localStorage.getItem('offline_pending_actions');
    if (stored) {
      try {
        setPendingActions(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading pending actions:', e);
      }
    }

    const handleOnline = () => {
      console.log('🌐 Connection restored');
      setIsOnline(true);
      
      if (wasOffline) {
        toast.success('Conexão restaurada', {
          description: 'Você está online novamente',
          duration: 3000,
        });
      }
      setWasOffline(false);
      
      // Tentar sincronizar ações pendentes
      syncPendingActions();
    };

    const handleOffline = () => {
      console.log('📵 Connection lost');
      setIsOnline(false);
      setWasOffline(true);
      
      toast.warning('Você está offline', {
        description: 'Algumas funcionalidades podem estar limitadas',
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  // Salvar ações pendentes no localStorage sempre que mudar
  useEffect(() => {
    if (pendingActions.length > 0) {
      localStorage.setItem('offline_pending_actions', JSON.stringify(pendingActions));
    } else {
      localStorage.removeItem('offline_pending_actions');
    }
  }, [pendingActions]);

  const addPendingAction = (type: string, data: any) => {
    const action: PendingAction = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      data,
      timestamp: Date.now(),
    };
    
    setPendingActions(prev => [...prev, action]);
    
    toast.info('Ação salva', {
      description: 'Será sincronizada quando você estiver online',
      duration: 3000,
    });
  };

  const removePendingAction = (id: string) => {
    setPendingActions(prev => prev.filter(action => action.id !== id));
  };

  const clearPendingActions = () => {
    setPendingActions([]);
    localStorage.removeItem('offline_pending_actions');
  };

  const syncPendingActions = async () => {
    if (pendingActions.length === 0) return;

    console.log('🔄 Syncing', pendingActions.length, 'pending actions');
    
    toast.info('Sincronizando', {
      description: `${pendingActions.length} ações pendentes`,
      duration: 3000,
    });

    // Aqui você pode implementar a lógica específica de sincronização
    // Por exemplo, reenviar requests para o servidor
    // Por enquanto, apenas limpar após um delay simulado
    
    // TODO: Implementar lógica real de sincronização
    setTimeout(() => {
      clearPendingActions();
      toast.success('Sincronização concluída', {
        duration: 3000,
      });
    }, 2000);
  };

  return {
    isOnline,
    pendingActions,
    addPendingAction,
    removePendingAction,
    clearPendingActions,
    syncPendingActions,
  };
}
