-- Corrigir trigger de FCM para funcionar corretamente
-- Remove dependência do Authorization header que não existe em triggers
-- Remove verificação de category IS NULL para enviar FCM para todas notificações

DROP TRIGGER IF EXISTS trg_notify_fcm_after_insert ON public.notifications;
DROP FUNCTION IF EXISTS public.notify_fcm_after_insert();

-- Nova função corrigida que chama edge function sem autenticação
CREATE OR REPLACE FUNCTION public.notify_fcm_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_token boolean;
  v_supabase_url text := 'https://hlyhgpjzosnxaxgpcayi.supabase.co';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhseWhncGp6b3NueGF4Z3BjYXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNDUzOTcsImV4cCI6MjA0NTcyMTM5N30.9A4Mf0_r6IyNuGLWGaJAIvCZrCMzgD0FEO1FeYZO4Hg';
BEGIN
  -- Verificar se usuário tem FCM token válido
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = NEW.user_auth_id 
    AND fcm_token IS NOT NULL 
    AND fcm_token != ''
  ) INTO v_has_token;
  
  -- Se tem token, chamar edge function
  IF v_has_token THEN
    -- Usar pg_net para chamar edge function
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-fcm-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', v_anon_key
      ),
      body := jsonb_build_object('notification_id', NEW.id)
    );
    
    -- Log para debug
    RAISE NOTICE 'FCM trigger called for notification % (user: %)', NEW.id, NEW.user_auth_id;
  ELSE
    RAISE NOTICE 'Skipping FCM for notification % - user has no FCM token', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Não falhar o INSERT se houver erro no envio
    RAISE WARNING 'Error in FCM trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER trg_notify_fcm_after_insert
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_fcm_after_insert();