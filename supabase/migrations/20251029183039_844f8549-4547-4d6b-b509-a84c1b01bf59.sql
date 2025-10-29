-- Remove trigger de notificação OneSignal PRIMEIRO (antes da função)
DROP TRIGGER IF EXISTS trg_notify_onesignal_after_insert ON notifications;

-- Remove função de notificação OneSignal
DROP FUNCTION IF EXISTS notify_onesignal_after_insert();

-- Remove colunas de OneSignal da tabela notifications
ALTER TABLE notifications 
  DROP COLUMN IF EXISTS onesignal_sent,
  DROP COLUMN IF EXISTS onesignal_sent_at,
  DROP COLUMN IF EXISTS onesignal_error;

-- Remove coluna de OneSignal da tabela users
ALTER TABLE users 
  DROP COLUMN IF EXISTS onesignal_player_id;