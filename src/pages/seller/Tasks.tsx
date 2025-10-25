import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Plus, Search, Calendar, User, Clock } from 'lucide-react';
import { TaskDialog } from '@/components/TaskDialog';
import { TaskDetailsDialog } from '@/components/TaskDetailsDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

interface Task {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  priority: string;
  due_at: string;
  created_at: string;
  updated_at: string;
  responsible_auth_id: string;
  assigned_users: string[];
  client_id: string | null;
  related_entity_id: string | null;
}

interface TaskWithUsers extends Task {
  responsible?: { name: string };
  assigned?: { name: string }[];
}

export default function Tasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithUsers | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Buscar tarefas
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Buscar usuários responsáveis e atribuídos
      const tasksWithUsers = await Promise.all(
        (data || []).map(async (task) => {
          // Buscar responsável
          const { data: responsible } = await supabase
            .from('users')
            .select('name')
            .eq('auth_user_id', task.responsible_auth_id)
            .single();

          // Buscar usuários atribuídos
          let assigned: { name: string }[] = [];
          if (task.assigned_users && task.assigned_users.length > 0) {
            const { data: users } = await supabase
              .from('users')
              .select('name')
              .in('auth_user_id', task.assigned_users);
            
            assigned = users || [];
          }
          
          return { 
            ...task, 
            responsible: responsible || { name: 'N/A' },
            assigned 
          };
        })
      );

      return tasksWithUsers as TaskWithUsers[];
    },
  });

  // Deletar tarefa
  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa excluída com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir tarefa');
    },
  });

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

  const filteredTasks = tasks.filter((task) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(searchLower) ||
      task.notes?.toLowerCase().includes(searchLower) ||
      task.responsible?.name.toLowerCase().includes(searchLower)
    );
  });

  const handleNewTask = () => {
    setSelectedTask(null);
    setDialogOpen(true);
  };

  const handleEditTask = (task: TaskWithUsers) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  const handleViewTask = (task: TaskWithUsers) => {
    setSelectedTask(task);
    setDetailsOpen(true);
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && selectedTask?.status !== 'completed';
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tarefas</h1>
          <p className="text-muted-foreground">Gerencie e acompanhe suas tarefas</p>
        </div>
        <Button onClick={handleNewTask}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tarefas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-5 w-full md:w-auto">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="pending">Pendente</TabsTrigger>
                <TabsTrigger value="in_progress">Em andamento</TabsTrigger>
                <TabsTrigger value="completed">Concluída</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelada</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Tarefas */}
      {isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma tarefa encontrada
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <Card
              key={task.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleViewTask(task)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">{task.title}</CardTitle>
                  <Badge variant={getStatusVariant(task.status)} className="shrink-0">
                    {getStatusLabel(task.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {task.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{task.notes}</p>
                )}
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Responsável:</span>
                    <span className="font-medium">{task.responsible?.name || 'N/A'}</span>
                  </div>

                  {task.assigned && task.assigned.length > 0 && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Equipe:</span>
                      <span className="font-medium">{task.assigned.length} usuário(s)</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Prazo:</span>
                    <span className={`font-medium ${isOverdue(task.due_at) ? 'text-destructive' : ''}`}>
                      {format(new Date(task.due_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Prioridade:</span>
                    <Badge variant="outline" className="text-xs">
                      {getPriorityLabel(task.priority)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Diálogo de criação/edição */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={selectedTask}
        onSuccess={() => {
          setDialogOpen(false);
          setSelectedTask(null);
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }}
      />

      {/* Diálogo de detalhes */}
      <TaskDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        task={selectedTask}
        onEdit={() => {
          setDetailsOpen(false);
          setDialogOpen(true);
        }}
        onDelete={(taskId) => {
          deleteMutation.mutate(taskId);
          setDetailsOpen(false);
          setSelectedTask(null);
        }}
      />
    </div>
  );
}
