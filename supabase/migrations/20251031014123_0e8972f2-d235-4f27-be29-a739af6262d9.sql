-- Recreate notify_fcm_after_insert with proper error handling
CREATE OR REPLACE FUNCTION public.notify_fcm_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fcm_token TEXT;
  v_http_response RECORD;
BEGIN
  -- Only attempt to send if notification has a category
  IF NEW.category IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if user has a valid FCM token
  SELECT fcm_token INTO v_fcm_token
  FROM public.users 
  WHERE auth_user_id = NEW.user_auth_id 
  AND fcm_token IS NOT NULL 
  AND fcm_token != '';

  -- If no valid token, just return without error
  IF v_fcm_token IS NULL THEN
    RETURN NEW;
  END IF;

  -- Attempt to send FCM notification with error handling
  BEGIN
    -- Make async HTTP call to edge function
    SELECT * INTO v_http_response
    FROM net.http_post(
      url := 'https://hlyhgpjzosnxaxgpcayi.supabase.co/functions/v1/send-fcm-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.headers')::json->>'authorization'
      ),
      body := jsonb_build_object('notification_id', NEW.id)
    );

    -- Log if there was an error response (optional, only if you want to track failures)
    IF v_http_response.status_code >= 400 THEN
      RAISE WARNING 'FCM notification failed with status %: %', 
        v_http_response.status_code, 
        v_http_response.content;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE WARNING 'Error sending FCM notification for notification_id %: %', 
      NEW.id, 
      SQLERRM;
  END;

  RETURN NEW;
END;
$function$;