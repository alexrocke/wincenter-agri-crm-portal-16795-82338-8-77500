import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONESIGNAL_APP_ID = '566922a7-98de-4c80-bb1a-f17964f15d09';
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Categorias que disparam notificação OneSignal
const ALLOWED_CATEGORIES = [
  'service_maintenance',
  'service_revision',
  'service_spraying',
  'demonstration',
  'sale',
  'commission',
  'task'
];

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notification_id } = await req.json();

    if (!notification_id) {
      console.error('❌ Missing notification_id');
      return new Response(
        JSON.stringify({ error: 'notification_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔔 Processing OneSignal notification: ${notification_id}`);

    // Criar cliente Supabase com service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar notificação
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('*, user_auth_id')
      .eq('id', notification_id)
      .single();

    if (notifError || !notification) {
      console.error('❌ Notification not found:', notifError);
      return new Response(
        JSON.stringify({ error: 'Notification not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Notification category: ${notification.category}`);

    // Filtrar por categoria permitida
    if (!notification.category || !ALLOWED_CATEGORIES.includes(notification.category)) {
      console.log(`⏭️ Category "${notification.category}" not allowed, skipping OneSignal`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Category not configured for OneSignal' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar player_id do usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('onesignal_player_id')
      .eq('auth_user_id', notification.user_auth_id)
      .single();

    if (userError || !user?.onesignal_player_id) {
      console.log(`⏭️ User has no OneSignal player_id, skipping`);
      
      // Atualizar notification com erro
      await supabase
        .from('notifications')
        .update({ 
          onesignal_error: 'No player_id configured',
          onesignal_sent: false
        })
        .eq('id', notification_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User has no OneSignal player_id' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📱 Sending to player_id: ${user.onesignal_player_id}`);

    // Preparar payload OneSignal
    const onesignalPayload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [user.onesignal_player_id],
      headings: { en: notification.title || 'Nova Notificação' },
      contents: { en: notification.message || '' },
      data: {
        notification_id: notification.id,
        category: notification.category,
        kind: notification.kind
      }
    };

    console.log('📤 Sending to OneSignal API...');

    // Enviar via OneSignal API
    const onesignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(onesignalPayload)
    });

    const onesignalData = await onesignalResponse.json();

    if (!onesignalResponse.ok) {
      console.error('❌ OneSignal API error:', onesignalData);
      
      // Atualizar notification com erro
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

    console.log('✅ OneSignal notification sent successfully:', onesignalData);

    // Atualizar notification com sucesso
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
        onesignal_id: onesignalData.id,
        recipients: onesignalData.recipients 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in send-onesignal-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
