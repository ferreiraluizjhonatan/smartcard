import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, payload } = body;

    if (action === 'save_photo') {
      const { elevator_id, phase_table, item_id, photo_url } = payload;
      
      if (!elevator_id || !phase_table || !item_id || !photo_url) {
        return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // First, get the current photos array
      const { data: currentItem, error: fetchError } = await supabase
        .from(phase_table)
        .select('photos_urls')
        .eq('id', item_id)
        .single();

      if (fetchError) throw fetchError;

      const currentPhotos = currentItem.photos_urls || [];
      const updatedPhotos = [...currentPhotos, photo_url];

      // Update the item
      const { error: updateError } = await supabase
        .from(phase_table)
        .update({ photos_urls: updatedPhotos })
        .eq('id', item_id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true, photo_url }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'send_message') {
      const { elevator_id, message, company_id } = payload;

      if (!elevator_id || !message) {
        return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { error: insertError } = await supabase
        .from('tickets')
        .insert([{
          elevator_id: elevator_id,
          company_id: company_id || null,
          title: "Mensagem do Mestre (Link Público)",
          description: message,
          status: 'pendente'
        }]);

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'update_progress') {
      const { phase_table, item_id, percentage, notes } = payload;
      
      if (!phase_table || !item_id || percentage === undefined) {
        return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const updateData: any = { percentage, updated_at: new Date().toISOString() };
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const { error: updateError } = await supabase
        .from(phase_table)
        .update(updateData)
        .eq('id', item_id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'save_mechanic_notes') {
      const { elevator_id, mechanic_notes } = payload;
      
      if (!elevator_id) {
        return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { error: updateError } = await supabase
        .from('elevators')
        .update({ mechanic_notes })
        .eq('id', elevator_id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500, headers: corsHeaders });
  }
});
