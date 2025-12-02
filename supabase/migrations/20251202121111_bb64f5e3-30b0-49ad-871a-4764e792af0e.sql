-- Corrigir search_path em funções para melhorar segurança
-- Alterando funções que não têm search_path definido ou têm formato inconsistente

-- 1. Atualizar notify_whatsapp_after_insert para usar search_path consistente
CREATE OR REPLACE FUNCTION public.notify_whatsapp_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Chamar edge function de forma assíncrona apenas se tiver categoria
  IF NEW.category IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://hlyhgpjzosnxaxgpcayi.supabase.co/functions/v1/send-whatsapp-notification',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('notification_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Atualizar notify_fcm_after_insert para usar search_path consistente
CREATE OR REPLACE FUNCTION public.notify_fcm_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- 3. Verificar e garantir que is_admin também tem search_path
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  );
$function$;

-- 4. Atualizar get_admin_user_ids para consistência
CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS TABLE(auth_user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT u.auth_user_id
  FROM public.users u
  WHERE u.role = 'admin' AND u.status = 'active';
$function$;