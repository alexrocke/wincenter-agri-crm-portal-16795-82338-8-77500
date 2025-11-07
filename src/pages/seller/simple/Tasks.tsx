import { useState, useEffect } from 'react';
import { SimplifiedLayout } from '@/components/layout/SimplifiedLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckSquare, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { EmptyState } from '@/components/simplified/EmptyState';
import { FloatingActionButton } from '@/components/simplified/FloatingActionButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, isToday, isThisWeek, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Task {
  id: string;
  title: string;
  notes: string;
  due_at: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
}

export default function SimplifiedTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'today' | 'week' | 'completed'>('pending');
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    notes: '',
    due_at: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  useEffect(() => {
    if (user?.id) {
      fetchTasks();
    }
  }, [user?.id]);

  useEffect(() => {
    applyFilter();
  }, [tasks, filter]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`responsible_auth_id.eq.${user!.id},assigned_users.cs.{${user!.id}}`)
        .order('due_at', { ascending: true });

      if (error) throw error;
      setTasks((data || []) as Task[]);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    let filtered = tasks;

    if (filter === 'pending') {
      filtered = tasks.filter(t => t.status === 'pending');
    } else if (filter === 'today') {
      filtered = tasks.filter(t => t.status === 'pending' && isToday(new Date(t.due_at)));
    } else if (filter === 'week') {
      filtered = tasks.filter(t => t.status === 'pending' && isThisWeek(new Date(t.due_at), { weekStartsOn: 0 }));
    } else if (filter === 'completed') {
      filtered = tasks.filter(t => t.status === 'completed');
    }

    setFilteredTasks(filtered);
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      toast.success(newStatus === 'completed' ? 'Tarefa concluída!' : 'Tarefa reaberta');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.due_at) {
      toast.error('Título e data são obrigatórios');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: newTask.title,
          notes: newTask.notes,
          due_at: newTask.due_at,
          priority: newTask.priority,
          status: 'pending',
          responsible_auth_id: user!.id,
          type: 'followup'
        }])
        .select()
        .single();

      if (error) throw error;
      
      setTasks(prev => [...prev, data as Task]);
      setNewTaskOpen(false);
      setNewTask({ title: '', notes: '', due_at: '', priority: 'medium' });
      toast.success('Tarefa criada com sucesso!');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Erro ao criar tarefa');
    }
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'text-destructive';
    if (priority === 'medium') return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  const getTaskStatus = (task: Task) => {
    if (task.status === 'completed') return { label: 'Concluída', color: 'text-green-600' };
    if (isPast(new Date(task.due_at))) return { label: 'Atrasada', color: 'text-destructive' };
    if (isToday(new Date(task.due_at))) return { label: 'Hoje', color: 'text-yellow-600' };
    return { label: 'Futura', color: 'text-muted-foreground' };
  };

  if (loading) {
    return (
      <SimplifiedLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </SimplifiedLayout>
    );
  }

  if (tasks.length === 0) {
    return (
      <SimplifiedLayout>
        <EmptyState
          icon={CheckSquare}
          title="Nenhuma tarefa cadastrada"
          description="Adicione sua primeira tarefa para começar"
          actionLabel="Adicionar Tarefa"
          onAction={() => setNewTaskOpen(true)}
        />
        <Sheet open={newTaskOpen} onOpenChange={setNewTaskOpen}>
          <SheetContent side="bottom" className="h-[90vh]">
            <SheetHeader>
              <SheetTitle>Nova Tarefa</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="due_at">Data de Vencimento *</Label>
                <Input
                  id="due_at"
                  type="datetime-local"
                  value={newTask.due_at}
                  onChange={(e) => setNewTask({ ...newTask, due_at: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={newTask.notes}
                  onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                  className="min-h-24"
                />
              </div>
              <Button onClick={handleCreateTask} size="lg" className="w-full">
                Criar Tarefa
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </SimplifiedLayout>
    );
  }

  return (
    <SimplifiedLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Tarefas ({filteredTasks.length})</h1>
        
        <Tabs value={filter} onValueChange={(v: any) => setFilter(v)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="today">Hoje</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="completed">Concluídas</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const status = getTaskStatus(task);
            return (
              <Card key={task.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={() => handleToggleTask(task.id, task.status)}
                    className="mt-1 h-6 w-6"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </h3>
                    {task.notes && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.notes}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(task.due_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                      {task.priority === 'high' && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <AlertCircle className={`h-3 w-3 ${getPriorityColor(task.priority)}`} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <FloatingActionButton onClick={() => setNewTaskOpen(true)} label="Nova Tarefa" />

        <Sheet open={newTaskOpen} onOpenChange={setNewTaskOpen}>
          <SheetContent side="bottom" className="h-[90vh]">
            <SheetHeader>
              <SheetTitle>Nova Tarefa</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="due_at">Data de Vencimento *</Label>
                <Input
                  id="due_at"
                  type="datetime-local"
                  value={newTask.due_at}
                  onChange={(e) => setNewTask({ ...newTask, due_at: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={newTask.notes}
                  onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                  className="min-h-24"
                />
              </div>
              <Button onClick={handleCreateTask} size="lg" className="w-full">
                Criar Tarefa
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </SimplifiedLayout>
  );
}
