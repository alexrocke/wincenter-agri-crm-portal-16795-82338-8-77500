import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function OfflineIndicator() {
  const { isOnline, pendingActions, syncPendingActions } = useOfflineStatus();

  // Não mostrar nada se estiver online e sem ações pendentes
  if (isOnline && pendingActions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:bottom-4 md:w-80">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4">
        {/* Status Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="text-sm font-medium text-foreground">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-warning" />
                <span className="text-sm font-medium text-foreground">Offline</span>
              </>
            )}
          </div>
          
          {pendingActions.length > 0 && (
            <Badge variant="secondary">
              {pendingActions.length} {pendingActions.length === 1 ? 'ação' : 'ações'}
            </Badge>
          )}
        </div>

        {/* Message */}
        {!isOnline && (
          <p className="text-xs text-muted-foreground mb-3">
            Você está offline. Suas ações serão sincronizadas quando a conexão for restaurada.
          </p>
        )}

        {/* Pending Actions */}
        {pendingActions.length > 0 && (
          <div className="space-y-2 mb-3">
            <p className="text-xs font-medium text-muted-foreground">
              Ações pendentes:
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {pendingActions.map((action) => (
                <div
                  key={action.id}
                  className="text-xs bg-muted/50 rounded px-2 py-1 flex items-center justify-between"
                >
                  <span className="truncate">{action.type}</span>
                  <span className="text-muted-foreground text-[10px] ml-2">
                    {new Date(action.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sync Button */}
        {isOnline && pendingActions.length > 0 && (
          <Button
            onClick={syncPendingActions}
            size="sm"
            className="w-full"
            variant="default"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar Agora
          </Button>
        )}
      </div>
    </div>
  );
}
