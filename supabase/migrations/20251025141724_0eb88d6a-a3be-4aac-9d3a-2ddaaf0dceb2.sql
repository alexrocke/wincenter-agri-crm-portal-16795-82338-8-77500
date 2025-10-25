-- Adicionar coluna para armazenar o player_id do OneSignal na tabela users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT;

-- Adicionar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_users_onesignal_player_id 
ON public.users(onesignal_player_id) 
WHERE onesignal_player_id IS NOT NULL;

-- Adicionar colunas para rastrear envio OneSignal na tabela notifications
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS onesignal_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onesignal_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onesignal_error TEXT;

-- Adicionar índice para consultas de notificações não enviadas
CREATE INDEX IF NOT EXISTS idx_notifications_onesignal_pending
ON public.notifications(onesignal_sent, created_at)
WHERE onesignal_sent = false;

-- Criar função para notificar OneSignal após inserção de notificação
CREATE OR REPLACE FUNCTION public.notify_onesignal_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Chamar edge function de forma assíncrona apenas se tiver categoria
  IF NEW.category IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://hlyhgpjzosnxaxgpcayi.supabase.co/functions/v1/send-onesignal-notification',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('notification_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para notificar OneSignal após inserção
DROP TRIGGER IF EXISTS trg_notify_onesignal_after_insert ON public.notifications;

CREATE TRIGGER trg_notify_onesignal_after_insert
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_onesignal_after_insert();