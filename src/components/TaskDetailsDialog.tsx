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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Edit, Trash2, Send, Calendar, User, Clock, MoreVertical, History, ChevronDown, X, Check } from 'lucide-react';
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
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteUpdateId, setDeleteUpdateId] = useState<string | null>(null);
  const [viewHistoryId, setViewHistoryId] = useState<string | null>(null);

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
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!task?.id && open,
  });

  // Buscar histórico de uma atualização específica
  const { data: updateHistory = [] } = useQuery({
    queryKey: ['task-update-history', viewHistoryId],
    queryFn: async () => {
      if (!viewHistoryId) return [];
      
      const { data, error } = await supabase
        .from('task_update_history')
        .select(`
          *,
          editor:users!task_update_history_edited_by_fkey(name, email)
        `)
        .eq('task_update_id', viewHistoryId)
        .order('edited_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!viewHistoryId,
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

  // Mutation para editar atualização
  const editUpdateMutation = useMutation({
    mutationFn: async ({ id, content, oldContent }: { id: string; content: string; oldContent: string }) => {
      // Salvar histórico
      const { error: historyError } = await supabase.from('task_update_history').insert({
        task_update_id: id,
        old_content: oldContent,
        edited_by: user?.id,
      });
      
      if (historyError) throw historyError;

      // Buscar edit_count atual
      const { data: currentUpdate } = await supabase
        .from('task_updates')
        .select('edit_count')
        .eq('id', id)
        .single();

      // Atualizar conteúdo
      const { error } = await supabase
        .from('task_updates')
        .update({
          content,
          updated_at: new Date().toISOString(),
          edited: true,
          edit_count: (currentUpdate?.edit_count || 0) + 1,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-updates', task.id] });
      setEditingUpdateId(null);
      setEditContent('');
      toast.success('Atualização editada!');
    },
    onError: () => {
      toast.error('Erro ao editar atualização');
    },
  });

  // Mutation para deletar atualização (soft delete)
  const deleteUpdateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('task_updates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-updates', task.id] });
      setDeleteUpdateId(null);
      toast.success('Atualização excluída!');
    },
    onError: () => {
      toast.error('Erro ao excluir atualização');
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

  const handleDeleteClick = () => {
    onDelete(task.id);
    setDeleteDialogOpen(false);
  };

  const handleEditUpdate = (update: any) => {
    setEditingUpdateId(update.id);
    setEditContent(update.content);
  };

  const handleSaveEdit = (updateId: string, oldContent: string) => {
    if (!editContent.trim()) {
      toast.error('Digite um conteúdo');
      return;
    }
    editUpdateMutation.mutate({ id: updateId, content: editContent.trim(), oldContent });
  };

  const handleCancelEdit = () => {
    setEditingUpdateId(null);
    setEditContent('');
  };

  const handleDeleteUpdate = (updateId: string) => {
    deleteUpdateMutation.mutate(updateId);
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
                    <div key={update.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback>
                            {update.user?.name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-sm font-medium">{update.user?.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(update.created_at), "dd/MM/yyyy 'às' HH:mm", {
                                    locale: ptBR,
                                  })}
                                </span>
                                {update.edited && (
                                  <Badge variant="outline" className="text-xs">
                                    Editado {update.edit_count}x
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {update.user_auth_id === user?.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditUpdate(update)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeleteUpdateId(update.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>

                          {editingUpdateId === update.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveEdit(update.id, update.content)}
                                  disabled={editUpdateMutation.isPending}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Salvar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {update.content}
                            </p>
                          )}

                          {/* Histórico de edições */}
                          {update.edited && update.edit_count > 0 && (
                            <Collapsible
                              open={viewHistoryId === update.id}
                              onOpenChange={(open) => setViewHistoryId(open ? update.id : null)}
                            >
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 text-xs">
                                  <History className="h-3 w-3 mr-1" />
                                  Ver histórico ({update.edit_count})
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-2 space-y-2">
                                {updateHistory.map((hist: any) => (
                                  <div key={hist.id} className="bg-muted/50 rounded p-2 text-xs">
                                    <div className="flex items-baseline gap-2 mb-1">
                                      <span className="font-medium">{hist.editor?.name}</span>
                                      <span className="text-muted-foreground">
                                        editou em{' '}
                                        {format(new Date(hist.edited_at), "dd/MM/yyyy 'às' HH:mm", {
                                          locale: ptBR,
                                        })}
                                      </span>
                                    </div>
                                    <p className="text-muted-foreground whitespace-pre-wrap">
                                      {hist.old_content}
                                    </p>
                                  </div>
                                ))}
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de exclusão da tarefa */}
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
            <AlertDialogAction onClick={handleDeleteClick} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmação de exclusão de atualização */}
      <AlertDialog open={!!deleteUpdateId} onOpenChange={(open) => !open && setDeleteUpdateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Atualização</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta atualização? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUpdateId && handleDeleteUpdate(deleteUpdateId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
