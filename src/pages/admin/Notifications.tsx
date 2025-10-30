import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Database } from '@/integrations/supabase/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Bell, BellRing, MessageSquare, AlertTriangle, Plus, Search, Trash2, Edit, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import NotificationFormDialog from '@/components/NotificationFormDialog';
import NotificationKindBadge from '@/components/NotificationKindBadge';
import { NotificationStatusBadge } from '@/components/NotificationStatusBadge';

type NotificationKind = Database['public']['Enums']['notification_kind'];

interface Notification {
  id: string;
  user_auth_id: string;
  kind: NotificationKind;
  category: string | null;
  title: string | null;
  message: string | null;
  read: boolean;
  whatsapp_sent: boolean | null;
  whatsapp_sent_at: string | null;
  fcm_sent: boolean | null;
  fcm_sent_at: string | null;
  fcm_error: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
}

interface User {
  auth_user_id: string;
  name: string;
  email: string;
}

interface Stats {
  total: number;
  unread: number;
  whatsappSent: number;
  fcmSent: number;
}

export default function AdminNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    unread: 0,
    whatsappSent: 0,
    fcmSent: 0
  });

  // Filtros
  const [filterKind, setFilterKind] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  const [filterUserId, setFilterUserId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Seleção múltipla
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | string[] | null>(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUsers();
    }
  }, [user, filterKind, filterCategory, filterRead, filterUserId, searchTerm, currentPage, pageSize]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // Buscar notificações
      let notifQuery = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filterKind !== 'all') {
        notifQuery = notifQuery.eq('kind', filterKind as NotificationKind);
      }

      if (filterCategory !== 'all') {
        notifQuery = notifQuery.eq('category', filterCategory);
      }

      if (filterRead !== 'all') {
        notifQuery = notifQuery.eq('read', filterRead === 'read');
      }

      if (filterUserId !== 'all') {
        notifQuery = notifQuery.eq('user_auth_id', filterUserId);
      }

      if (searchTerm) {
        notifQuery = notifQuery.or(`title.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%`);
      }

      // Paginação
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: notifData, error: notifError, count } = await notifQuery.range(from, to);

      if (notifError) throw notifError;

      // Buscar informações dos usuários
      if (notifData && notifData.length > 0) {
        const userIds = [...new Set(notifData.map(n => n.user_auth_id))];
        const { data: usersData } = await supabase
          .from('users')
          .select('auth_user_id, name, email')
          .in('auth_user_id', userIds);

        const usersMap = new Map(usersData?.map(u => [u.auth_user_id, u]) || []);

        const enrichedNotifications = notifData.map(n => ({
          ...n,
          user_name: usersMap.get(n.user_auth_id)?.name || 'Usuário não encontrado',
          user_email: usersMap.get(n.user_auth_id)?.email || ''
        }));

        setNotifications(enrichedNotifications);
      } else {
        setNotifications([]);
      }
      
      setTotalCount(count || 0);

      // Calcular estatísticas
      const statsQuery = await supabase
        .from('notifications')
        .select('read, whatsapp_sent, fcm_sent');

      if (statsQuery.data) {
        setStats({
          total: statsQuery.data.length,
          unread: statsQuery.data.filter(n => !n.read).length,
          whatsappSent: statsQuery.data.filter(n => n.whatsapp_sent).length,
          fcmSent: statsQuery.data.filter(n => n.fcm_sent).length
        });
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      toast.error('Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('auth_user_id, name, email')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const ids = Array.isArray(deleteTarget) ? deleteTarget : [deleteTarget];

      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast.success(`${ids.length} notificação(ões) deletada(s) com sucesso`);
      setSelectedIds([]);
      fetchNotifications();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast.error('Erro ao deletar notificação(ões)');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleRead = async (id: string, currentRead: boolean) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: !currentRead })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Notificação marcada como ${!currentRead ? 'lida' : 'não lida'}`);
      fetchNotifications();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar notificação');
    }
  };

  const handleResendWhatsApp = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);

    if (!notification?.category) {
      toast.error('Notificação sem categoria não pode ser enviada via WhatsApp');
      return;
    }

    try {
      await supabase
        .from('notifications')
        .update({
          whatsapp_sent: false,
          whatsapp_sent_at: null
        })
        .eq('id', notificationId);

      const response = await fetch(
        'https://hlyhgpjzosnxaxgpcayi.supabase.co/functions/v1/send-whatsapp-notification',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_id: notificationId })
        }
      );

      if (!response.ok) throw new Error('Falha ao reenviar');

      toast.success('Notificação reenviada via WhatsApp!');
      fetchNotifications();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao reenviar via WhatsApp');
    }
  };

  const handleResendFCM = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);

    if (!notification?.category) {
      toast.error('Notificação sem categoria não pode ser enviada via Push');
      return;
    }

    try {
      await supabase
        .from('notifications')
        .update({
          fcm_sent: false,
          fcm_sent_at: null,
          fcm_error: null
        })
        .eq('id', notificationId);

      const response = await fetch(
        'https://hlyhgpjzosnxaxgpcayi.supabase.co/functions/v1/send-fcm-notification',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_id: notificationId })
        }
      );

      if (!response.ok) throw new Error('Falha ao reenviar');

      toast.success('Notificação Push reenviada!');
      fetchNotifications();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao reenviar Push Notification');
    }
  };



  const handleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map(n => n.id));
    }
  };

  const handleExportCSV = () => {
    const csvData = notifications.map(n => ({
      'Data': format(new Date(n.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      'Usuário': n.user_name,
      'Email': n.user_email,
      'Tipo': n.kind,
      'Categoria': n.category || '-',
      'Título': n.title || '',
      'Mensagem': n.message || '',
      'Lida': n.read ? 'Sim' : 'Não',
      'WhatsApp': n.whatsapp_sent ? 'Enviado' : 'Não enviado'
    }));

    const headers = Object.keys(csvData[0] || {});
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `notificacoes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success('Dados exportados com sucesso!');
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Notificações</h1>
            <p className="text-muted-foreground">Gerencie todas as notificações do sistema</p>
          </div>
          <Button onClick={() => { setEditingNotification(null); setIsFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Notificação
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Não Lidas</CardTitle>
              <BellRing className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unread}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Push Notifications</CardTitle>
              <Bell className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.fcmSent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">WhatsApp</CardTitle>
              <MessageSquare className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.whatsappSent}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4 mb-4">
              <Select value={filterKind} onValueChange={setFilterKind}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  <SelectItem value="service_maintenance">Manutenção</SelectItem>
                  <SelectItem value="service_revision">Revisão</SelectItem>
                  <SelectItem value="service_spraying">Pulverização</SelectItem>
                  <SelectItem value="demonstration">Demonstração</SelectItem>
                  <SelectItem value="sale">Venda</SelectItem>
                  <SelectItem value="commission">Comissão</SelectItem>
                  <SelectItem value="task">Tarefa</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterRead} onValueChange={setFilterRead}>
                <SelectTrigger>
                  <SelectValue placeholder="Status Leitura" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="read">Lidas</SelectItem>
                  <SelectItem value="unread">Não Lidas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterUserId} onValueChange={setFilterUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Usuários</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.auth_user_id} value={u.auth_user_id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título ou mensagem..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ações em Lote */}
        {selectedIds.length > 0 && (
          <Card className="border-primary">
            <CardContent className="flex items-center justify-between p-4">
              <div className="text-sm font-medium">
                {selectedIds.length} notificação(ões) selecionada(s)
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  setDeleteTarget(selectedIds);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar Selecionadas
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center p-8">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma notificação encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectedIds.length === notifications.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Push</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map(notification => (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedIds.includes(notification.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedIds([...selectedIds, notification.id]);
                              } else {
                                setSelectedIds(selectedIds.filter(id => id !== notification.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{notification.user_name}</div>
                            <div className="text-xs text-muted-foreground">{notification.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <NotificationKindBadge kind={notification.kind} />
                        </TableCell>
                        <TableCell>
                          {notification.category ? (
                            <Badge variant="outline">{notification.category}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={notification.title || ''}>
                            {notification.title || '-'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate" title={notification.message || ''}>
                            {notification.message || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {notification.read ? (
                            <Badge variant="secondary">Lida</Badge>
                          ) : (
                            <Badge variant="default">Não lida</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <NotificationStatusBadge
                            fcmSent={notification.fcm_sent}
                            fcmSentAt={notification.fcm_sent_at}
                            fcmError={notification.fcm_error}
                          />
                        </TableCell>
                        <TableCell>
                          {notification.whatsapp_sent ? (
                            <Badge variant="default" className="gap-1">
                              <MessageSquare className="h-3 w-3" />
                              WhatsApp Enviado
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <MessageSquare className="h-3 w-3" />
                              Não enviado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleRead(notification.id, notification.read)}
                              title={notification.read ? 'Marcar como não lida' : 'Marcar como lida'}
                            >
                              {notification.read ? '📬' : '✅'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingNotification(notification);
                                setIsFormOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {notification.category && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResendFCM(notification.id)}
                                title="Reenviar via Push Notification"
                              >
                                <Bell className="h-4 w-4" />
                              </Button>
                            )}
                            {notification.category && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResendWhatsApp(notification.id)}
                                title="Reenviar via WhatsApp"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeleteTarget(notification.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Paginação */}
            {totalCount > pageSize && (
              <div className="flex items-center justify-between p-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Items por página:</span>
                  <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <NotificationFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        notification={editingNotification}
        users={users}
        onSuccess={() => {
          fetchNotifications();
          setIsFormOpen(false);
          setEditingNotification(null);
        }}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Notificação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar {Array.isArray(deleteTarget) ? `${deleteTarget.length} notificações` : 'esta notificação'}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
