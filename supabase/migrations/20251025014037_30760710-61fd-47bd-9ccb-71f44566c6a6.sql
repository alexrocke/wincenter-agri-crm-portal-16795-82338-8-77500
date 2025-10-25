-- Adicionar políticas UPDATE e DELETE para task_updates
CREATE POLICY "task_updates_update_authenticated" 
ON public.task_updates 
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "task_updates_delete_authenticated" 
ON public.task_updates 
FOR DELETE 
USING (true);