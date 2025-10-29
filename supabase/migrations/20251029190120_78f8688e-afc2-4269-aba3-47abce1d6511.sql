-- Adicionar colunas para OneSignal na tabela users
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT;

-- Adicionar colunas para rastreamento OneSignal na tabela notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS onesignal_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onesignal_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS onesignal_error TEXT;

-- Criar função para enviar notificação via OneSignal
CREATE OR REPLACE FUNCTION public.notify_onesignal_after_insert()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para envio automático OneSignal
DROP TRIGGER IF EXISTS trg_notify_onesignal_after_insert ON public.notifications;
CREATE TRIGGER trg_notify_onesignal_after_insert
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_onesignal_after_insert();