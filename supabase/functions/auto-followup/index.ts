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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let tasksCreated = 0;

    // 1. Visitas concluídas sem oportunidade criada em 3 dias
    const { data: visitsWithoutOpp } = await supabase
      .from('visits')
      .select('id, client_id, seller_auth_id, clients!inner(contact_name)')
      .eq('status', 'completed')
      .lt('scheduled_at', threeDaysAgo.toISOString())
      .not('client_id', 'is', null);

    if (visitsWithoutOpp) {
      for (const visit of visitsWithoutOpp) {
        const { data: existingOpp } = await supabase
          .from('opportunities')
          .select('id')
          .eq('client_id', visit.client_id)
          .gte('created_at', threeDaysAgo.toISOString())
          .limit(1);

        if (!existingOpp || existingOpp.length === 0) {
          const { data: existingTask } = await supabase
            .from('tasks')
            .select('id')
            .eq('type', 'followup')
            .eq('client_id', visit.client_id)
            .eq('related_entity_id', visit.id)
            .limit(1);

          if (!existingTask || existingTask.length === 0) {
            await supabase.from('tasks').insert({
              responsible_auth_id: visit.seller_auth_id,
              assigned_users: [visit.seller_auth_id],
              type: 'followup',
              client_id: visit.client_id,
              related_entity_id: visit.id,
              title: 'Follow-up: Verificar interesse após visita',
              notes: `Visita realizada há 3 dias sem criação de oportunidade. Cliente: ${(visit.clients as any)?.contact_name || 'N/A'}`,
              priority: 'medium',
              status: 'pending',
              due_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            });
            tasksCreated++;
          }
        }
      }
    }

    // 2. Demonstrações concluídas sem oportunidade em 5 dias
    const { data: demosWithoutOpp } = await supabase
      .from('demonstrations')
      .select('id, client_id, assigned_users, clients!inner(contact_name)')
      .eq('status', 'completed')
      .lt('date', fiveDaysAgo.toISOString())
      .not('client_id', 'is', null);

    if (demosWithoutOpp) {
      for (const demo of demosWithoutOpp) {
        const { data: existingOpp } = await supabase
          .from('opportunities')
          .select('id')
          .eq('client_id', demo.client_id)
          .gte('created_at', fiveDaysAgo.toISOString())
          .limit(1);

        if (!existingOpp || existingOpp.length === 0) {
          const { data: existingTask } = await supabase
            .from('tasks')
            .select('id')
            .eq('type', 'followup')
            .eq('client_id', demo.client_id)
            .eq('related_entity_id', demo.id)
            .limit(1);

          if (!existingTask || existingTask.length === 0) {
            const responsibleId = demo.assigned_users?.[0];
            if (responsibleId) {
              await supabase.from('tasks').insert({
                responsible_auth_id: responsibleId,
                assigned_users: demo.assigned_users,
                type: 'followup',
                client_id: demo.client_id,
                related_entity_id: demo.id,
                title: 'Follow-up: Fechar após demonstração',
                notes: `Demonstração realizada há 5 dias sem criação de oportunidade. Cliente: ${(demo.clients as any)?.contact_name || 'N/A'}`,
                priority: 'high',
                status: 'pending',
                due_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
              });
              tasksCreated++;
            }
          }
        }
      }
    }

    // 3. Orçamentos sem resposta em 7 dias
    const { data: unresponsiveOpps } = await supabase
      .from('opportunities')
      .select('id, client_id, seller_auth_id, clients!inner(contact_name)')
      .in('stage', ['lead', 'qualified', 'proposal'])
      .lt('created_at', sevenDaysAgo.toISOString());

    if (unresponsiveOpps) {
      for (const opp of unresponsiveOpps) {
        const { data: existingTask } = await supabase
          .from('tasks')
          .select('id')
          .eq('type', 'followup')
          .eq('related_entity_id', opp.id)
          .gte('created_at', sevenDaysAgo.toISOString())
          .limit(1);

        if (!existingTask || existingTask.length === 0) {
          await supabase.from('tasks').insert({
            responsible_auth_id: opp.seller_auth_id,
            assigned_users: [opp.seller_auth_id],
            type: 'followup',
            client_id: opp.client_id,
            related_entity_id: opp.id,
            title: 'Follow-up: Contatar sobre orçamento',
            notes: `Orçamento sem resposta há 7 dias. Cliente: ${(opp.clients as any)?.contact_name || 'N/A'}`,
            priority: 'high',
            status: 'pending',
            due_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          });
          tasksCreated++;
        }
      }
    }

    // 4. Clientes inativos há 30 dias
    const { data: inactiveClients } = await supabase
      .from('clients')
      .select('id, seller_auth_id, contact_name, updated_at')
      .lt('updated_at', thirtyDaysAgo.toISOString());

    if (inactiveClients) {
      for (const client of inactiveClients) {
        const { data: recentActivity } = await supabase
          .from('visits')
          .select('id')
          .eq('client_id', client.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .limit(1);

        if (!recentActivity || recentActivity.length === 0) {
          const { data: existingTask } = await supabase
            .from('tasks')
            .select('id')
            .eq('type', 'followup')
            .eq('client_id', client.id)
            .gte('created_at', thirtyDaysAgo.toISOString())
            .limit(1);

          if (!existingTask || existingTask.length === 0) {
            await supabase.from('tasks').insert({
              responsible_auth_id: client.seller_auth_id,
              assigned_users: [client.seller_auth_id],
              type: 'followup',
              client_id: client.id,
              title: 'Follow-up: Reativar cliente inativo',
              notes: `Cliente sem atividade há 30 dias. Cliente: ${client.contact_name}`,
              priority: 'medium',
              status: 'pending',
              due_at: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
            });
            tasksCreated++;
          }
        }
      }
    }

    console.log(`Auto-followup criou ${tasksCreated} tarefas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tasksCreated,
        message: `${tasksCreated} tarefas de follow-up criadas com sucesso`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no auto-followup:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});