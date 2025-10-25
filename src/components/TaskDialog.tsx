import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const taskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  notes: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high']),
  due_at: z.string().min(1, 'Data de prazo é obrigatória'),
  responsible_auth_id: z.string().min(1, 'Responsável é obrigatório'),
  assigned_users: z.array(z.string()),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
  onSuccess: () => void;
}

export function TaskDialog({ open, onOpenChange, task, onSuccess }: TaskDialogProps) {
  const { user } = useAuth();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      notes: '',
      status: 'pending',
      priority: 'medium',
      due_at: '',
      responsible_auth_id: user?.id || '',
      assigned_users: [],
    },
  });

  // Buscar usuários do sistema
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('auth_user_id, name, email')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Mutation para criar/atualizar tarefa
  const mutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const taskData = {
        title: data.title,
        notes: data.notes || null,
        status: data.status,
        priority: data.priority,
        due_at: new Date(data.due_at).toISOString(),
        responsible_auth_id: data.responsible_auth_id,
        assigned_users: data.assigned_users,
        type: 'general',
      };

      if (task?.id) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', task.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([taskData]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(task?.id ? 'Tarefa atualizada!' : 'Tarefa criada!');
      onSuccess();
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar tarefa');
    },
  });

  // Preencher formulário quando editar
  useEffect(() => {
    if (task && open) {
      form.reset({
        title: task.title,
        notes: task.notes || '',
        status: task.status,
        priority: task.priority,
        due_at: task.due_at ? new Date(task.due_at).toISOString().split('T')[0] : '',
        responsible_auth_id: task.responsible_auth_id,
        assigned_users: task.assigned_users || [],
      });
    } else if (!task && open) {
      form.reset({
        title: '',
        notes: '',
        status: 'pending',
        priority: 'medium',
        due_at: '',
        responsible_auth_id: user?.id || '',
        assigned_users: [],
      });
    }
  }, [task, open, user, form]);

  const onSubmit = (data: TaskFormData) => {
    mutation.mutate(data);
  };

  const assignedUsers = form.watch('assigned_users');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task?.id ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o título da tarefa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva os detalhes da tarefa"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">Em andamento</SelectItem>
                        <SelectItem value="completed">Concluída</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="due_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prazo de Encerramento *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsible_auth_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável Principal *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.auth_user_id} value={u.auth_user_id}>
                          {u.name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigned_users"
              render={() => (
                <FormItem>
                  <FormLabel>Usuários Vinculados</FormLabel>
                  <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
                    {users.map((u) => (
                      <FormField
                        key={u.auth_user_id}
                        control={form.control}
                        name="assigned_users"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(u.auth_user_id)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  const updated = checked
                                    ? [...current, u.auth_user_id]
                                    : current.filter((id) => id !== u.auth_user_id);
                                  field.onChange(updated);
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {u.name} ({u.email})
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
