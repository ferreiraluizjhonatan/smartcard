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
    const { elevator_id } = await req.json();

    if (!elevator_id) {
       return new Response(JSON.stringify({ error: "Missing elevator_id" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: elevator, error: elError } = await supabase
       .from('elevators')
       .select('id, name, status, project_name, equipment_id, created_at, company_id')
       .eq('id', elevator_id)
       .single();

    if (elError || !elevator) {
       return new Response(JSON.stringify({ error: "Elevator not found" }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch all phases
    const [preInst, assem, adjust] = await Promise.all([
      supabase.from('pre_installation_checklists').select('id, item_name, is_started, percentage, planned_start_date, planned_end_date, photos_urls, notes, pending_items, reminders').eq('elevator_id', elevator_id).order('id'),
      supabase.from('assembly_checklists').select('id, item_name, is_started, percentage, planned_start_date, planned_end_date, photos_urls, notes, pending_items, reminders').eq('elevator_id', elevator_id).order('id'),
      supabase.from('adjustment_checklists').select('id, item_name, is_started, percentage, planned_start_date, planned_end_date, photos_urls, notes, pending_items, reminders').eq('elevator_id', elevator_id).order('id')
    ]);

    let checklists: any[] = [];
    
    const sortByNumber = (list: any[]) => list.sort((a, b) => {
      const numA = parseInt(a.item_name.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.item_name.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });

    if (preInst.data) {
       checklists = checklists.concat(sortByNumber(preInst.data).map(i => ({...i, item_name: `[Pré-Instalação] ${i.item_name}`, table_name: 'pre_installation_checklists'})));
    }
    if (assem.data) {
       checklists = checklists.concat(sortByNumber(assem.data).map(i => ({...i, item_name: `[Montagem] ${i.item_name}`, table_name: 'assembly_checklists'})));
    }
    if (adjust.data) {
       checklists = checklists.concat(sortByNumber(adjust.data).map(i => ({...i, item_name: `[Ajuste] ${i.item_name}`, table_name: 'adjustment_checklists'})));
    }
    const { data: tickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('elevator_id', elevator_id)
        .order('created_at', { ascending: false });

    return new Response(JSON.stringify({ elevator, checklists, tickets: tickets || [] }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500, headers: corsHeaders });
  }
});
