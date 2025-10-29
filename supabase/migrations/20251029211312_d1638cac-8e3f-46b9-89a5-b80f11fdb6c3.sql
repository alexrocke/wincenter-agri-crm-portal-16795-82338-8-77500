-- Adicionar coluna fcm_token na tabela users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Adicionar colunas de tracking FCM na tabela notifications
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS fcm_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fcm_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS fcm_error TEXT;

-- Criar função para notificar via FCM após inserir notificação
CREATE OR REPLACE FUNCTION public.notify_fcm_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Chamar edge function de forma assíncrona apenas se tiver categoria e usuário tiver fcm_token
  IF NEW.category IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = NEW.user_auth_id 
    AND fcm_token IS NOT NULL 
    AND fcm_token != ''
  ) THEN
    PERFORM net.http_post(
      url := 'https://hlyhgpjzosnxaxgpcayi.supabase.co/functions/v1/send-fcm-notification',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('notification_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para FCM (depois do trigger de WhatsApp)
DROP TRIGGER IF EXISTS trg_notify_fcm_after_insert ON public.notifications;
CREATE TRIGGER trg_notify_fcm_after_insert
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_fcm_after_insert();