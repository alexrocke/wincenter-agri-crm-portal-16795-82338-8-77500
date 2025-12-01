import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting expired reservations check...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find all expired active reservations
    const { data: expiredReservations, error: fetchError } = await supabase
      .from('stock_reservations')
      .select(`
        id,
        product_id,
        opportunity_id,
        quantity,
        expires_at,
        products(name)
      `)
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('❌ Error fetching expired reservations:', fetchError);
      throw fetchError;
    }

    console.log(`📦 Found ${expiredReservations?.length || 0} expired reservations`);

    if (!expiredReservations || expiredReservations.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired reservations found',
          releasedCount: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Release all expired reservations
    const { error: updateError } = await supabase
      .from('stock_reservations')
      .update({ 
        status: 'released',
        released_at: new Date().toISOString()
      })
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

    if (updateError) {
      console.error('❌ Error releasing reservations:', updateError);
      throw updateError;
    }

    console.log(`✅ Released ${expiredReservations.length} expired reservations`);

    // Create notifications for sellers about expired opportunities
    const opportunityIds = [...new Set(expiredReservations.map(r => r.opportunity_id))];
    
    for (const oppId of opportunityIds) {
      // Get opportunity and seller info
      const { data: opp } = await supabase
        .from('opportunities')
        .select(`
          id,
          seller_auth_id,
          gross_value,
          clients(contact_name)
        `)
        .eq('id', oppId)
        .single();

      if (opp && opp.seller_auth_id) {
        const clientName = (opp.clients as any)?.contact_name || 'Cliente';
        const reservedItems = expiredReservations.filter(r => r.opportunity_id === oppId);
        const productNames = reservedItems
          .map(r => (r.products as any)?.name)
          .filter(Boolean)
          .join(', ');

        await supabase
          .from('notifications')
          .insert({
            user_auth_id: opp.seller_auth_id,
            kind: 'warning',
            title: 'Reserva de Estoque Expirada',
            message: `A reserva de estoque do orçamento para ${clientName} expirou.\n\nProdutos liberados: ${productNames}\n\nConsidere renovar o orçamento ou marcar como perdido.`,
            category: 'stock_reservation',
            metadata: {
              opportunity_id: oppId,
              expired_items: reservedItems.length,
              products: productNames
            }
          });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Expired reservations released successfully',
        releasedCount: expiredReservations.length,
        opportunities: opportunityIds.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error in check-expired-reservations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
