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
    const { month, year } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user } } = await supabase.auth.getUser(token!);
    if (!user) throw new Error('Não autenticado');

    // Buscar dados do vendedor
    const { data: seller } = await supabase
      .from('users')
      .select('name, email')
      .eq('auth_user_id', user.id)
      .single();

    // Período do relatório
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const previousMonthStart = new Date(year, month - 2, 1);
    const previousMonthEnd = new Date(year, month - 1, 0, 23, 59, 59);

    // Buscar vendas do mês
    const { data: sales } = await supabase
      .from('sales')
      .select(`
        *,
        clients(contact_name, city, state),
        sale_items(*, products(name, category))
      `)
      .eq('seller_auth_id', user.id)
      .gte('sold_at', startDate.toISOString())
      .lte('sold_at', endDate.toISOString())
      .eq('status', 'closed');

    // Vendas do mês anterior
    const { data: previousSales } = await supabase
      .from('sales')
      .select('gross_value, estimated_profit')
      .eq('seller_auth_id', user.id)
      .gte('sold_at', previousMonthStart.toISOString())
      .lte('sold_at', previousMonthEnd.toISOString())
      .eq('status', 'closed');

    // Visitas realizadas
    const { data: visits } = await supabase
      .from('visits')
      .select('*, clients(contact_name)')
      .eq('seller_auth_id', user.id)
      .gte('scheduled_at', startDate.toISOString())
      .lte('scheduled_at', endDate.toISOString())
      .eq('status', 'completed');

    // Demonstrações realizadas
    const { data: demos } = await supabase
      .from('demonstrations')
      .select('*, clients(contact_name)')
      .contains('assigned_users', [user.id])
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .eq('status', 'completed');

    // Serviços realizados
    const { data: services } = await supabase
      .from('services')
      .select('*, clients(contact_name)')
      .contains('assigned_users', [user.id])
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .eq('status', 'completed');

    // Oportunidades
    const { data: opportunities } = await supabase
      .from('opportunities')
      .select('stage, gross_value')
      .eq('seller_auth_id', user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Comissões
    const { data: commissions } = await supabase
      .from('commissions')
      .select('amount, pay_status')
      .eq('seller_auth_id', user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Cálculos
    const totalRevenue = sales?.reduce((sum, s) => sum + Number(s.gross_value), 0) || 0;
    const totalProfit = sales?.reduce((sum, s) => sum + Number(s.estimated_profit), 0) || 0;
    const totalCommissions = commissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
    const paidCommissions = commissions?.filter(c => c.pay_status === 'paid').reduce((sum, c) => sum + Number(c.amount), 0) || 0;
    
    const prevRevenue = previousSales?.reduce((sum, s) => sum + Number(s.gross_value), 0) || 0;
    const prevProfit = previousSales?.reduce((sum, s) => sum + Number(s.estimated_profit), 0) || 0;
    
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const profitGrowth = prevProfit > 0 ? ((totalProfit - prevProfit) / prevProfit) * 100 : 0;

    // Vendas por categoria
    const salesByCategory = new Map<string, number>();
    sales?.forEach(sale => {
      sale.sale_items?.forEach((item: any) => {
        const category = item.products?.category || 'Sem categoria';
        salesByCategory.set(category, (salesByCategory.get(category) || 0) + Number(item.unit_price) * item.qty);
      });
    });

    // Clientes atendidos
    const uniqueClients = new Set(
      [...(sales?.map(s => s.client_id) || []),
       ...(visits?.map(v => v.client_id) || []),
       ...(demos?.map(d => d.client_id) || [])]
    );

    // Taxa de conversão
    const wonOpps = opportunities?.filter(o => o.stage === 'won').length || 0;
    const totalOpps = opportunities?.length || 0;
    const conversionRate = totalOpps > 0 ? (wonOpps / totalOpps) * 100 : 0;

    const report = {
      period: {
        month,
        year,
        monthName: new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long' }),
      },
      seller: {
        name: seller?.name,
        email: seller?.email,
      },
      summary: {
        totalRevenue,
        totalProfit,
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        salesCount: sales?.length || 0,
        averageTicket: sales && sales.length > 0 ? totalRevenue / sales.length : 0,
        revenueGrowth,
        profitGrowth,
      },
      activities: {
        visits: visits?.length || 0,
        demos: demos?.length || 0,
        services: services?.length || 0,
        clientsServed: uniqueClients.size,
      },
      opportunities: {
        total: totalOpps,
        won: wonOpps,
        conversionRate,
        pipelineValue: opportunities?.reduce((sum, o) => sum + (Number(o.gross_value) || 0), 0) || 0,
      },
      commissions: {
        total: totalCommissions,
        paid: paidCommissions,
        pending: totalCommissions - paidCommissions,
      },
      salesByCategory: Array.from(salesByCategory.entries()).map(([category, value]) => ({
        category,
        value,
        percentage: (value / totalRevenue) * 100,
      })).sort((a, b) => b.value - a.value),
      topClients: sales
        ?.reduce((acc: any[], sale) => {
          const existing = acc.find(c => c.clientId === sale.client_id);
          if (existing) {
            existing.revenue += Number(sale.gross_value);
            existing.salesCount++;
          } else {
            acc.push({
              clientId: sale.client_id,
              name: sale.clients?.contact_name,
              city: sale.clients?.city,
              state: sale.clients?.state,
              revenue: Number(sale.gross_value),
              salesCount: 1,
            });
          }
          return acc;
        }, [])
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10) || [],
      generatedAt: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});