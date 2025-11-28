import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationData {
  id: string;
  user_auth_id: string;
  kind: string;
  title: string;
  message: string;
  category: string | null;
  created_at: string;
  metadata?: any;
}

interface UserData {
  name: string;
  email: string;
  phone: string | null;
}

// Mapear categoria para emoji e label
const categoryConfig: Record<string, { emoji: string; label: string }> = {
  'service_maintenance': { emoji: '🔧', label: 'Manutenção' },
  'service_revision': { emoji: '🔍', label: 'Revisão' },
  'service_spraying': { emoji: '🚁', label: 'Pulverização' },
  'demonstration': { emoji: '📊', label: 'Demonstração' },
  'sale': { emoji: '💰', label: 'Venda' },
  'commission': { emoji: '💵', label: 'Comissão' }
};

// Formatar data para exibição
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}

// Formatar hora para exibição
function formatTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return '-';
  }
}

// Formatar valor monetário
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00';
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Extrair dados estruturados do metadata ou mensagem
function extractStructuredData(notification: NotificationData): any {
  const metadata = notification.metadata || {};
  
  return {
    // Dados do serviço/evento
    serviceType: metadata.service_type || metadata.type || null,
    
    // Dados do cliente
    client: {
      name: metadata.client_name || metadata.clientName || null,
      farmName: metadata.farm_name || metadata.property_name || null,
      city: metadata.city || null,
      state: metadata.state || null,
      phone: metadata.client_phone || null
    },
    
    // Agendamento
    schedule: {
      date: metadata.date || metadata.scheduled_date || null,
      formattedDate: formatDate(metadata.date || metadata.scheduled_date),
      formattedTime: formatTime(metadata.date || metadata.scheduled_date)
    },
    
    // Responsáveis
    responsible: metadata.assigned_users || metadata.responsible || [],
    
    // Dados do serviço
    service: {
      hectares: metadata.hectares || null,
      valuePerHectare: metadata.value_per_hectare || null,
      totalValue: metadata.total_value || null,
      crop: metadata.crop || null,
      equipmentModel: metadata.equipment_model || null,
      equipmentSerial: metadata.equipment_serial || null
    },
    
    // Dados de venda (se aplicável)
    sale: {
      grossValue: metadata.gross_value || null,
      products: metadata.products || [],
      paymentMethod: metadata.payment_method || null
    },
    
    // Dados de comissão (se aplicável)
    commission: {
      amount: metadata.commission_amount || null,
      percent: metadata.commission_percent || null,
      status: metadata.pay_status || null
    }
  };
}

// Construir mensagem formatada para WhatsApp
function buildWhatsAppMessage(notification: NotificationData, structuredData: any, categoryInfo: { emoji: string; label: string }): string {
  const lines: string[] = [];
  
  // Cabeçalho
  lines.push(`${categoryInfo.emoji} *${notification.title}*`);
  lines.push('');
  
  // Dados do cliente
  if (structuredData.client.name) {
    lines.push(`👤 *Cliente:* ${structuredData.client.name}`);
  }
  if (structuredData.client.farmName) {
    lines.push(`🏠 *Propriedade:* ${structuredData.client.farmName}`);
  }
  
  // Local
  const location = [structuredData.client.city, structuredData.client.state].filter(Boolean).join(' - ');
  if (location) {
    lines.push(`📍 *Local:* ${location}`);
  }
  
  // Data/Hora
  if (structuredData.schedule.date) {
    lines.push(`📆 *Data:* ${structuredData.schedule.formattedDate} às ${structuredData.schedule.formattedTime}`);
  }
  
  // Responsáveis
  if (structuredData.responsible && structuredData.responsible.length > 0) {
    const responsibleNames = Array.isArray(structuredData.responsible) 
      ? structuredData.responsible.join(', ')
      : structuredData.responsible;
    lines.push(`👥 *Responsáveis:* ${responsibleNames}`);
  }
  
  // Dados específicos por categoria
  if (notification.category?.includes('service') || notification.category === 'demonstration') {
    lines.push('');
    lines.push('📋 *Detalhes do Serviço:*');
    
    if (structuredData.service.crop) {
      lines.push(`🌱 Cultura: ${structuredData.service.crop}`);
    }
    if (structuredData.service.hectares) {
      lines.push(`📏 Hectares: ${structuredData.service.hectares} ha`);
    }
    if (structuredData.service.valuePerHectare) {
      lines.push(`💵 Valor/ha: ${formatCurrency(structuredData.service.valuePerHectare)}`);
    }
    if (structuredData.service.totalValue) {
      lines.push(`💰 *Valor Total: ${formatCurrency(structuredData.service.totalValue)}*`);
    }
    if (structuredData.service.equipmentModel) {
      lines.push(`🚁 Equipamento: ${structuredData.service.equipmentModel}`);
    }
  }
  
  // Dados de venda
  if (notification.category === 'sale' && structuredData.sale.grossValue) {
    lines.push('');
    lines.push('🛒 *Detalhes da Venda:*');
    lines.push(`💰 Valor: ${formatCurrency(structuredData.sale.grossValue)}`);
    if (structuredData.sale.paymentMethod) {
      lines.push(`💳 Pagamento: ${structuredData.sale.paymentMethod}`);
    }
  }
  
  // Dados de comissão
  if (notification.category === 'commission' && structuredData.commission.amount) {
    lines.push('');
    lines.push('💵 *Detalhes da Comissão:*');
    lines.push(`💰 Valor: ${formatCurrency(structuredData.commission.amount)}`);
    if (structuredData.commission.percent) {
      lines.push(`📊 Percentual: ${structuredData.commission.percent}%`);
    }
  }
  
  // Mensagem original (se não conseguiu extrair dados estruturados)
  const hasStructuredContent = structuredData.client.name || 
                               structuredData.service.totalValue || 
                               structuredData.sale.grossValue;
  
  if (!hasStructuredContent && notification.message) {
    lines.push('');
    lines.push(notification.message);
  }
  
  return lines.join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notification_id } = await req.json();

    if (!notification_id) {
      console.error('❌ notification_id não fornecido');
      return new Response(
        JSON.stringify({ error: 'notification_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📱 Processando notificação:', notification_id);

    // Inicializar Supabase client com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar notificação
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notification_id)
      .single<NotificationData>();

    if (notificationError || !notification) {
      console.error('❌ Erro ao buscar notificação:', notificationError);
      return new Response(
        JSON.stringify({ error: 'Notificação não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filtrar apenas categorias que devem ser enviadas para WhatsApp
    const allowedCategories = [
      'service_maintenance',
      'service_revision',
      'service_spraying',
      'demonstration',
      'sale',
      'commission'
    ];

    if (!notification.category || !allowedCategories.includes(notification.category)) {
      console.log('ℹ️ Categoria não permitida para WhatsApp:', notification.category);
      return new Response(
        JSON.stringify({ message: 'Categoria não requer envio para WhatsApp' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Categoria permitida:', notification.category);

    // Buscar dados do usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('name, email, phone')
      .eq('auth_user_id', notification.user_auth_id)
      .single<UserData>();

    if (userError || !user) {
      console.error('❌ Erro ao buscar usuário:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('👤 Usuário encontrado:', user.name);

    // Obter configuração da categoria
    const categoryInfo = categoryConfig[notification.category] || { 
      emoji: '📌', 
      label: notification.category 
    };

    // Extrair dados estruturados
    const structuredData = extractStructuredData(notification);

    // Construir mensagem formatada
    const formattedMessage = buildWhatsAppMessage(notification, structuredData, categoryInfo);

    // Preparar payload para n8n
    const webhookUrl = Deno.env.get('N8N_WHATSAPP_WEBHOOK_URL');
    
    if (!webhookUrl) {
      console.error('❌ N8N_WHATSAPP_WEBHOOK_URL não configurado');
      return new Response(
        JSON.stringify({ error: 'Webhook URL não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construir payload organizado para N8N
    const payload = {
      // Dados do usuário destinatário
      user: {
        id: notification.user_auth_id,
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      
      // Dados básicos da notificação
      notification: {
        id: notification.id,
        kind: notification.kind,
        title: notification.title,
        category: notification.category,
        timestamp: notification.created_at
      },
      
      // Dados estruturados para WhatsApp
      whatsapp: {
        // Mensagem formatada pronta para enviar
        formattedMessage: formattedMessage,
        
        // Categoria do serviço
        category: {
          code: notification.category,
          label: categoryInfo.label,
          emoji: categoryInfo.emoji
        },
        
        // Dados do cliente
        client: structuredData.client,
        
        // Agendamento
        schedule: structuredData.schedule,
        
        // Responsáveis
        responsible: structuredData.responsible,
        
        // Dados do serviço
        service: structuredData.service,
        
        // Dados de venda
        sale: structuredData.sale,
        
        // Dados de comissão
        commission: structuredData.commission
      },
      
      // Metadata original (para retrocompatibilidade)
      metadata: notification.metadata || {}
    };

    console.log('📤 Enviando para n8n:', { 
      userName: user.name, 
      category: notification.category,
      hasFormattedMessage: !!formattedMessage,
      messageLength: formattedMessage.length
    });

    // Enviar para n8n
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('⚠️ Falha ao enviar para n8n (não bloqueante):', errorText);
      
      // Retornar sucesso parcial - não bloqueia o fluxo
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Notificação processada, mas WhatsApp falhou',
          whatsapp_sent: false,
          error: errorText
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Mensagem enviada com sucesso para n8n');

    // Marcar notificação como enviada
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ 
        whatsapp_sent: true, 
        whatsapp_sent_at: new Date().toISOString() 
      })
      .eq('id', notification_id);

    if (updateError) {
      console.error('⚠️ Erro ao marcar notificação como enviada:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notificação enviada para WhatsApp',
        whatsapp_sent: true,
        formattedMessage: formattedMessage
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro geral:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
