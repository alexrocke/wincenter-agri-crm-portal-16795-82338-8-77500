import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, opportunityId, clientId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let systemPrompt = '';
    let userPrompt = '';
    let contextData: any = {};

    // Buscar dados para análise
    if (action === 'predict_conversion' && opportunityId) {
      const { data: opp } = await supabase
        .from('opportunities')
        .select(`
          *,
          clients(*),
          opportunity_items(*, products(*))
        `)
        .eq('id', opportunityId)
        .single();

      if (!opp) {
        throw new Error('Oportunidade não encontrada');
      }

      const { data: history } = await supabase
        .from('sales')
        .select('*')
        .eq('client_id', opp.client_id);

      contextData = { opp, history };

      systemPrompt = `Você é um analista de vendas agrícolas especializado em CRM.
Analise os dados da oportunidade e histórico do cliente para prever a probabilidade de conversão.
Considere: valor do negócio, histórico do cliente, estágio atual, produtos, tempo desde criação.`;

      userPrompt = `Oportunidade:
- Estágio: ${opp.stage}
- Valor: R$ ${opp.gross_value}
- Cliente: ${opp.clients?.contact_name}
- Produtos: ${opp.opportunity_items?.map((i: any) => i.products?.name).join(', ')}
- Criada há: ${Math.floor((Date.now() - new Date(opp.created_at).getTime()) / (1000 * 60 * 60 * 24))} dias
- Histórico: ${history?.length || 0} vendas anteriores

Retorne APENAS um JSON no formato:
{
  "probability": 75,
  "factors": ["Cliente com histórico positivo", "Valor dentro da média"],
  "recommendations": ["Agendar follow-up em 3 dias", "Destacar benefícios técnicos"],
  "bestTimeToContact": "Manhã, terça ou quarta"
}`;

    } else if (action === 'predict_sales') {
      const authHeader = req.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token!);
      
      if (!user) throw new Error('Não autenticado');

      const { data: sales } = await supabase
        .from('sales')
        .select('gross_value, sold_at')
        .eq('seller_auth_id', user.id)
        .gte('sold_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
        .order('sold_at');

      contextData = { sales };

      systemPrompt = `Você é um analista de vendas especializado em previsão de receita.
Analise o histórico dos últimos 6 meses e preveja as vendas do próximo mês.
Considere tendências, sazonalidade e padrões.`;

      userPrompt = `Histórico dos últimos 6 meses:
${sales?.map(s => `- ${new Date(s.sold_at).toLocaleDateString('pt-BR')}: R$ ${s.gross_value}`).join('\n')}

Retorne APENAS um JSON no formato:
{
  "predictedRevenue": 150000,
  "predictedSalesCount": 12,
  "confidence": 80,
  "trend": "crescente",
  "insights": ["Aumento de 15% comparado ao mês anterior", "Pico esperado na segunda quinzena"]
}`;

    } else if (action === 'suggest_products' && clientId) {
      const { data: client } = await supabase
        .from('clients')
        .select('*, sales(sale_items(products(*)))')
        .eq('id', clientId)
        .single();

      if (!client) {
        throw new Error('Cliente não encontrado');
      }

      const { data: allProducts } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .limit(20);

      contextData = { client, allProducts };

      systemPrompt = `Você é um consultor de vendas agrícolas especializado em cross-sell.
Baseado no histórico de compras do cliente e catálogo disponível, sugira produtos relevantes.`;

      userPrompt = `Cliente:
- Nome: ${client.contact_name}
- Culturas: ${client.crops?.join(', ') || 'Não informado'}
- Hectares: ${client.hectares || 'Não informado'}
- Histórico: ${client.sales?.length || 0} compras

Produtos já comprados:
${client.sales?.flatMap((s: any) => s.sale_items?.map((i: any) => i.products?.name)).filter(Boolean).join(', ') || 'Nenhum'}

Produtos disponíveis:
${allProducts?.map(p => `${p.name} (R$ ${p.price})`).join(', ')}

Retorne APENAS um JSON no formato:
{
  "recommendations": [
    {
      "productName": "Nome do Produto",
      "reason": "Por que é relevante para este cliente",
      "priority": "high"
    }
  ]
}`;

    } else if (action === 'identify_potential') {
      const authHeader = req.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token!);
      
      if (!user) throw new Error('Não autenticado');

      const { data: clients } = await supabase
        .from('clients')
        .select(`
          *,
          visits(id),
          sales(gross_value),
          opportunities(stage)
        `)
        .eq('seller_auth_id', user.id)
        .limit(50);

      contextData = { clients };

      systemPrompt = `Você é um analista de relacionamento com clientes agrícolas.
Identifique os 5 clientes com maior potencial de vendas baseado em engajamento e histórico.`;

      userPrompt = `Clientes:
${clients?.map(c => `
- ${c.contact_name}
  Visitas: ${c.visits?.length || 0}
  Vendas: R$ ${c.sales?.reduce((sum: number, s: any) => sum + Number(s.gross_value), 0) || 0}
  Oportunidades: ${c.opportunities?.length || 0} (${c.opportunities?.filter((o: any) => o.stage !== 'lost').length || 0} ativas)
`).join('\n')}

Retorne APENAS um JSON no formato:
{
  "topClients": [
    {
      "name": "Nome do Cliente",
      "score": 95,
      "reasons": ["Alto engajamento", "Histórico positivo"],
      "nextAction": "Agendar visita para apresentar novos produtos"
    }
  ]
}`;
    } else {
      throw new Error('Ação inválida');
    }

    // Chamar Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na API Lovable AI:', aiResponse.status, errorText);
      throw new Error(`Erro na API de IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;

    // Extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta da IA não contém JSON válido');
    }

    const result = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na previsão de IA:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});