import { useState, useEffect } from 'react';
import { SimplifiedLayout } from '@/components/layout/SimplifiedLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { EmptyState } from '@/components/simplified/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  kind: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function SimplifiedNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_auth_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Erro ao marcar como lida');
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_auth_id', user!.id)
        .eq('read', false);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('Todas marcadas como lidas');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erro ao marcar todas como lidas');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notificação removida');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Erro ao remover notificação');
    }
  };

  const getKindBadge = (kind: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      info: { label: 'Info', variant: 'default' },
      success: { label: 'Sucesso', variant: 'default' },
      warning: { label: 'Aviso', variant: 'outline' },
      alert: { label: 'Alerta', variant: 'destructive' }
    };
    const config = variants[kind] || variants.info;
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <SimplifiedLayout>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </SimplifiedLayout>
    );
  }

  if (notifications.length === 0) {
    return (
      <SimplifiedLayout>
        <EmptyState
          icon={Bell}
          title="Nenhuma notificação"
          description="Você não tem notificações no momento"
        />
      </SimplifiedLayout>
    );
  }

  return (
    <SimplifiedLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            Avisos {unreadCount > 0 && `(${unreadCount})`}
          </h1>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline" size="sm">
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar Todas
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-4 ${!notification.read ? 'bg-accent/10 border-accent' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getKindBadge(notification.kind)}
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{notification.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {!notification.read && (
                    <Button
                      onClick={() => markAsRead(notification.id)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    onClick={() => deleteNotification(notification.id)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </SimplifiedLayout>
  );
}
