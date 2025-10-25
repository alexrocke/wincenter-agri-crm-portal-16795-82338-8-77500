-- Adicionar coluna title na tabela tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Nova Tarefa';

-- Criar tabela para histórico de atualizações/comentários das tarefas
CREATE TABLE IF NOT EXISTS public.task_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_auth_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela task_updates
ALTER TABLE public.task_updates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para task_updates
CREATE POLICY "task_updates_select_authenticated" 
ON public.task_updates 
FOR SELECT 
USING (true);

CREATE POLICY "task_updates_insert_authenticated" 
ON public.task_updates 
FOR INSERT 
WITH CHECK (true);

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_task_updates_task_id ON public.task_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_responsible ON public.tasks(responsible_auth_id);