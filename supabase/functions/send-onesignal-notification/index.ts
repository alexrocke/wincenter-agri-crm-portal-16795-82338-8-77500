import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONESIGNAL_APP_ID = '78a7d0aa-6f16-45db-aed0-1730a713894e';

interface NotificationPayload {
  notification_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const onesignalApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!onesignalApiKey) {
      console.error('ONESIGNAL_REST_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'OneSignal not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { notification_id } = await req.json() as NotificationPayload;

    console.log('Processing OneSignal notification:', notification_id);

    // Buscar notificação
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notification_id)
      .single();

    if (notifError || !notification) {
      console.error('Notification not found:', notifError);
      return new Response(
        JSON.stringify({ error: 'Notification not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se tem categoria (obrigatório)
    if (!notification.category) {
      console.log('Notification without category, skipping OneSignal');
      return new Response(
        JSON.stringify({ message: 'No category, OneSignal skipped' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar player_id do usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('onesignal_player_id, name')
      .eq('auth_user_id', notification.user_auth_id)
      .single();

    if (userError || !user || !user.onesignal_player_id) {
      console.log('User without OneSignal player_id, skipping');
      await supabase
        .from('notifications')
        .update({
          onesignal_sent: false,
          onesignal_error: 'Usuário sem player_id configurado'
        })
        .eq('id', notification_id);

      return new Response(
        JSON.stringify({ message: 'User without player_id' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending to OneSignal player:', user.onesignal_player_id);

    // Enviar via OneSignal
    const onesignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${onesignalApiKey}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: [user.onesignal_player_id],
        headings: { en: notification.title || 'Nova Notificação' },
        contents: { en: notification.message || '' },
        data: {
          notification_id: notification.id,
          category: notification.category,
          kind: notification.kind
        }
      })
    });

    const onesignalData = await onesignalResponse.json();

    if (!onesignalResponse.ok) {
      console.error('OneSignal API error:', onesignalData);
      await supabase
        .from('notifications')
        .update({
          onesignal_sent: false,
          onesignal_error: JSON.stringify(onesignalData)
        })
        .eq('id', notification_id);

      return new Response(
        JSON.stringify({ error: 'OneSignal API error', details: onesignalData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OneSignal sent successfully:', onesignalData);

    // Atualizar status de envio
    await supabase
      .from('notifications')
      .update({
        onesignal_sent: true,
        onesignal_sent_at: new Date().toISOString(),
        onesignal_error: null
      })
      .eq('id', notification_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Push notification sent',
        onesignal_response: onesignalData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-onesignal-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
