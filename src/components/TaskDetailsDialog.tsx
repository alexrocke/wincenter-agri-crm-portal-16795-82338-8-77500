import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Edit, Trash2, Send, Calendar, User, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TaskDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any;
  onEdit: () => void;
  onDelete: (taskId: string) => void;
}

export function TaskDetailsDialog({
  open,
  onOpenChange,
  task,
  onEdit,
  onDelete,
}: TaskDetailsDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newUpdate, setNewUpdate] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Buscar atualizações da tarefa
  const { data: updates = [] } = useQuery({
    queryKey: ['task-updates', task?.id],
    queryFn: async () => {
      if (!task?.id) return [];
      
      const { data, error } = await supabase
        .from('task_updates')
        .select(`
          *,
          user:users!task_updates_user_auth_id_fkey(name, email)
        `)
        .eq('task_id', task.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!task?.id && open,
  });

  // Mutation para adicionar atualização
  const addUpdateMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from('task_updates').insert({
        task_id: task.id,
        user_auth_id: user?.id,
        content,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-updates', task.id] });
      setNewUpdate('');
      toast.success('Atualização adicionada!');
    },
    onError: () => {
      toast.error('Erro ao adicionar atualização');
    },
  });

  if (!task) return null;

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      in_progress: 'Em andamento',
      completed: 'Concluída',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  };

  const getStatusVariant = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      pending: 'secondary',
      in_progress: 'default',
      completed: 'outline',
      cancelled: 'destructive',
    };
    return variants[status] || 'default';
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
    };
    return labels[priority] || priority;
  };

  const handleAddUpdate = () => {
    if (!newUpdate.trim()) {
      toast.error('Digite uma atualização');
      return;
    }
    addUpdateMutation.mutate(newUpdate.trim());
  };

  const handleDelete = () => {
    onDelete(task.id);
    setDeleteDialogOpen(false);
  };

  const isOverdue = new Date(task.due_at) < new Date() && task.status !== 'completed';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="text-2xl pr-8">{task.title}</DialogTitle>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={onEdit}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status e Prioridade */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant={getStatusVariant(task.status)}>
                {getStatusLabel(task.status)}
              </Badge>
              <Badge variant="outline">
                Prioridade: {getPriorityLabel(task.priority)}
              </Badge>
            </div>

            {/* Descrição */}
            {task.notes && (
              <div>
                <h3 className="font-semibold mb-2">Descrição</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{task.notes}</p>
              </div>
            )}

            {/* Informações */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Responsável:</span>
                <span className="text-sm font-medium">{task.responsible?.name || 'N/A'}</span>
              </div>

              {task.assigned && task.assigned.length > 0 && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm text-muted-foreground">Equipe:</span>
                  <div className="flex flex-wrap gap-1">
                    {task.assigned.map((u: any, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {u.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Prazo:</span>
                <span className={`text-sm font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                  {format(new Date(task.due_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {isOverdue && ' (Atrasado)'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Criado em:</span>
                <span className="text-sm">
                  {format(new Date(task.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>

            <Separator />

            {/* Atualizações */}
            <div>
              <h3 className="font-semibold mb-4">Atualizações e Comentários</h3>

              {/* Adicionar nova atualização */}
              <div className="flex gap-2 mb-4">
                <Textarea
                  placeholder="Adicionar atualização ou comentário..."
                  value={newUpdate}
                  onChange={(e) => setNewUpdate(e.target.value)}
                  rows={3}
                />
                <Button
                  size="icon"
                  onClick={handleAddUpdate}
                  disabled={addUpdateMutation.isPending || !newUpdate.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Lista de atualizações */}
              <div className="space-y-4">
                {updates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma atualização ainda
                  </p>
                ) : (
                  updates.map((update: any) => (
                    <div key={update.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {update.user?.name?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">{update.user?.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(update.created_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {update.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
