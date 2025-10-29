import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import NotificationKindBadge from './NotificationKindBadge';

type NotificationKind = Database['public']['Enums']['notification_kind'];

interface User {
  auth_user_id: string;
  name: string;
  email: string;
}

interface Notification {
  id: string;
  user_auth_id: string;
  kind: NotificationKind;
  category: string | null;
  title: string | null;
  message: string | null;
  read: boolean;
}

interface NotificationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: Notification | null;
  users: User[];
  onSuccess: () => void;
}

export default function NotificationFormDialog({
  open,
  onOpenChange,
  notification,
  users,
  onSuccess
}: NotificationFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    userId: string;
    kind: NotificationKind;
    category: string;
    title: string;
    message: string;
    markAsRead: boolean;
  }>({
    userId: '',
    kind: 'info',
    category: '',
    title: '',
    message: '',
    markAsRead: false
  });

  useEffect(() => {
    if (notification) {
      setFormData({
        userId: notification.user_auth_id,
        kind: notification.kind,
        category: notification.category || '',
        title: notification.title || '',
        message: notification.message || '',
        markAsRead: notification.read
      });
    } else {
      setFormData({
        userId: '',
        kind: 'info',
        category: '',
        title: '',
        message: '',
        markAsRead: false
      });
    }
  }, [notification]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validações
      if (!formData.userId) {
        toast.error('Selecione um usuário');
        return;
      }
      if (!formData.title || formData.title.length > 100) {
        toast.error('Título é obrigatório (máx. 100 caracteres)');
        return;
      }
      if (!formData.message || formData.message.length > 500) {
        toast.error('Mensagem é obrigatória (máx. 500 caracteres)');
        return;
      }

      if (notification) {
        // UPDATE
        const { error } = await supabase
          .from('notifications')
          .update({
            kind: formData.kind,
            category: formData.category || null,
            title: formData.title,
            message: formData.message,
            read: formData.markAsRead
          })
          .eq('id', notification.id);

        if (error) throw error;
        toast.success('Notificação atualizada com sucesso');
      } else {
        // INSERT
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_auth_id: formData.userId,
            kind: formData.kind,
            category: formData.category || null,
            title: formData.title,
            message: formData.message,
            read: formData.markAsRead
          });

        if (error) throw error;
        toast.success('Notificação criada com sucesso');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar notificação:', error);
      toast.error('Erro ao salvar notificação');
    } finally {
      setLoading(false);
    }
  };

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'info': return <Info className="h-8 w-8 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
      case 'success': return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'alert': return <AlertCircle className="h-8 w-8 text-red-500" />;
      default: return <Info className="h-8 w-8 text-blue-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {notification ? 'Editar Notificação' : 'Nova Notificação'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dados">Dados Principais</TabsTrigger>
              <TabsTrigger value="config">Configurações</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            {/* Aba 1: Dados Principais */}
            <TabsContent value="dados" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="userId">
                  Usuário Destinatário <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.userId} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, userId: v }))}
                  disabled={!!notification}
                >
                  <SelectTrigger id="userId">
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.auth_user_id} value={u.auth_user_id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {notification && (
                  <p className="text-xs text-muted-foreground">
                    O destinatário não pode ser alterado após a criação
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Tipo <span className="text-red-500">*</span>
                </Label>
                <RadioGroup 
                  value={formData.kind}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, kind: v as NotificationKind }))}
                  className="grid grid-cols-4 gap-4"
                >
                  <div>
                    <RadioGroupItem value="info" id="info" className="peer sr-only" />
                    <Label
                      htmlFor="info"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Info className="mb-2 h-6 w-6 text-blue-500" />
                      Info
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="warning" id="warning" className="peer sr-only" />
                    <Label
                      htmlFor="warning"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <AlertTriangle className="mb-2 h-6 w-6 text-yellow-500" />
                      Warning
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="success" id="success" className="peer sr-only" />
                    <Label
                      htmlFor="success"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <CheckCircle className="mb-2 h-6 w-6 text-green-500" />
                      Success
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="alert" id="alert" className="peer sr-only" />
                    <Label
                      htmlFor="alert"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <AlertCircle className="mb-2 h-6 w-6 text-red-500" />
                      Alert
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione uma categoria (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    <SelectItem value="service_maintenance">Manutenção</SelectItem>
                    <SelectItem value="service_revision">Revisão</SelectItem>
                    <SelectItem value="service_spraying">Pulverização</SelectItem>
                    <SelectItem value="demonstration">Demonstração</SelectItem>
                    <SelectItem value="sale">Venda</SelectItem>
                    <SelectItem value="commission">Comissão</SelectItem>
                    <SelectItem value="task">Tarefa</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Categoria determina se a notificação será enviada via WhatsApp
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">
                  Título <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  maxLength={100}
                  placeholder="Digite o título da notificação"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.title.length}/100 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">
                  Mensagem <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  maxLength={500}
                  rows={4}
                  placeholder="Digite a mensagem da notificação"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.message.length}/500 caracteres
                </p>
              </div>
            </TabsContent>

            {/* Aba 2: Configurações */}
            <TabsContent value="config" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Opções de Envio</CardTitle>
                  <CardDescription>
                    Configure como a notificação será enviada
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="markAsRead"
                      checked={formData.markAsRead}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, markAsRead: !!checked }))}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="markAsRead" className="cursor-pointer">
                        Marcar como lida ao criar
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        A notificação não aparecerá como não lida para o usuário
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-md space-y-2">
                    <h4 className="font-medium text-sm">Envio Automático</h4>
                    <p className="text-xs text-muted-foreground">
                      Se uma categoria estiver selecionada, a notificação será automaticamente enviada via <strong>WhatsApp</strong> para usuários com telefone cadastrado.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Notificações sem categoria <strong>não serão</strong> enviadas via WhatsApp, apenas aparecerão no sistema.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba 3: Preview */}
            <TabsContent value="preview" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Preview da Notificação</CardTitle>
                  <CardDescription>
                    Veja como a notificação aparecerá para o usuário
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Preview Visual */}
                  <div className="border rounded-lg p-4 space-y-3 bg-card">
                    <div className="flex items-start gap-3">
                      {getKindIcon(formData.kind)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <NotificationKindBadge kind={formData.kind} />
                          {formData.category && (
                            <span className="text-xs px-2 py-1 bg-secondary rounded-md">
                              {formData.category}
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold">
                          {formData.title || 'Título da notificação'}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formData.message || 'Mensagem da notificação'}
                        </p>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : notification ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
