-- Remover colunas relacionadas ao OneSignal da tabela users
ALTER TABLE public.users DROP COLUMN IF EXISTS onesignal_player_id;

-- Remover colunas relacionadas ao OneSignal da tabela notifications
ALTER TABLE public.notifications DROP COLUMN IF EXISTS onesignal_sent;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS onesignal_sent_at;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS onesignal_error;

-- Remover trigger que chamava a função OneSignal
DROP TRIGGER IF EXISTS trg_notify_onesignal_after_insert ON public.notifications;

-- Remover função que chamava a edge function OneSignal
DROP FUNCTION IF EXISTS public.notify_onesignal_after_insert();