-- Adicionar política de DELETE para tarefas
CREATE POLICY "tasks_delete_authenticated" 
ON public.tasks 
FOR DELETE 
USING (true);