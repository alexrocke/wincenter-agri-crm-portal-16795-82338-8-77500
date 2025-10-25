-- Adicionar campos para histórico de atualizações
ALTER TABLE public.task_updates 
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS edited boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS edit_count integer DEFAULT 0;

-- Criar tabela para histórico de edições de atualizações
CREATE TABLE IF NOT EXISTS public.task_update_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_update_id uuid NOT NULL REFERENCES public.task_updates(id) ON DELETE CASCADE,
  old_content text NOT NULL,
  edited_by uuid NOT NULL,
  edited_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.task_update_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para histórico
CREATE POLICY "task_update_history_select_authenticated" 
ON public.task_update_history 
FOR SELECT 
USING (true);

CREATE POLICY "task_update_history_insert_authenticated" 
ON public.task_update_history 
FOR INSERT 
WITH CHECK (true);

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_task_update_history_task_update_id 
ON public.task_update_history(task_update_id);