import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FCMPayload {
  message: {
    token: string;
    notification: {
      title: string;
      body: string;
    };
    data?: Record<string, string>;
    webpush?: {
      fcm_options?: {
        link?: string;
      };
    };
  };
}

async function getAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  
  // Criar JWT para OAuth 2.0
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  // Importar chave privada
  const encoder = new TextEncoder();
  const pemKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  const pemContents = pemKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Criar assinatura JWT
  const jwtHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwtPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwtUnsigned = `${jwtHeader}.${jwtPayload}`;

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(jwtUnsigned)
  );

  const jwtSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${jwtUnsigned}.${jwtSignature}`;

  // Trocar JWT por access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${await tokenResponse.text()}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function sendFCM(token: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
  console.log('🔔 Sending FCM notification:', { title, body, hasData: !!data });

  const accessToken = await getAccessToken();
  const projectId = 'wincenter-c31d6';

  const payload: FCMPayload = {
    message: {
      token,
      notification: {
        title,
        body,
      },
      data: data || {},
      webpush: {
        fcm_options: {
          link: 'https://hlyhgpjzosnxaxgpcayi.lovable.app',
        },
      },
    },
  };

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ FCM API error:', error);
    throw new Error(`FCM API error: ${error}`);
  }

  const result = await response.json();
  console.log('✅ FCM sent successfully:', result);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notification_id } = await req.json();
    
    if (!notification_id) {
      throw new Error('notification_id is required');
    }

    console.log('📨 [FCM] Processing notification:', notification_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar notificação
    console.log('🔍 [FCM] Fetching notification from database...');
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notification_id)
      .single();

    if (notifError || !notification) {
      console.error('❌ [FCM] Error fetching notification:', notifError);
      throw new Error(`Notification not found: ${notification_id}`);
    }

    console.log('✅ [FCM] Notification loaded:', {
      id: notification.id,
      title: notification.title,
      user: notification.user_auth_id,
      category: notification.category,
      kind: notification.kind
    });

    // Buscar token FCM do usuário
    console.log('👤 [FCM] Fetching user FCM token...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('fcm_token, name, email')
      .eq('auth_user_id', notification.user_auth_id)
      .single();

    if (userError || !user) {
      console.error('❌ [FCM] User not found:', userError);
      throw new Error(`User not found: ${notification.user_auth_id}`);
    }

    const fcmToken = user.fcm_token;

    if (!fcmToken || fcmToken.trim() === '') {
      console.warn('⚠️ [FCM] User has no FCM token, skipping:', user.name);
      // Update notification to reflect this
      await supabase
        .from('notifications')
        .update({ 
          fcm_error: 'No FCM token registered',
          fcm_sent: false 
        })
        .eq('id', notification_id);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User has no FCM token',
          user: user.name
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('✅ [FCM] User loaded:', {
      name: user.name,
      email: user.email,
      hasToken: true,
      tokenPreview: fcmToken.substring(0, 20) + '...'
    });

    // Enviar notificação FCM
    console.log('🚀 [FCM] Sending notification via Firebase...');
    try {
      await sendFCM(
        fcmToken,
        notification.title || 'Nova Notificação',
        notification.message || '',
        {
          notification_id: notification.id,
          category: notification.category || '',
          kind: notification.kind || 'info',
        }
      );

      console.log('✅ [FCM] Notification sent successfully to:', user.name);

      // Atualizar registro de envio
      await supabase
        .from('notifications')
        .update({
          fcm_sent: true,
          fcm_sent_at: new Date().toISOString(),
          fcm_error: null,
        })
        .eq('id', notification_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'FCM notification sent successfully',
          user: user.name,
          notification_id: notification_id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } catch (fcmError: any) {
      console.error('❌ [FCM] Error sending notification:', fcmError);
      console.error('📋 [FCM] Error details:', {
        message: fcmError.message,
        stack: fcmError.stack,
        user: user.name,
        notification_id: notification_id
      });

      // Registrar erro
      await supabase
        .from('notifications')
        .update({
          fcm_sent: false,
          fcm_error: fcmError.message || 'Unknown error',
          fcm_sent_at: new Date().toISOString()
        })
        .eq('id', notification_id);

      throw fcmError;
    }
  } catch (error: any) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
