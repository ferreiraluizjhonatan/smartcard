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
    const { telegramId } = await req.json();

    if (!telegramId) {
       return new Response(JSON.stringify({ error: "Missing telegramId" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let mName = '';
    const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('telegram_id', telegramId).single();
    
    if (profile) {
      mName = profile.full_name;
    } else {
      const { data: tech } = await supabase.from('tecnicos_empresas').select('nome').eq('telegram_id', telegramId).single();
      if (tech) mName = tech.nome;
    }

    if (!mName) {
      return new Response(JSON.stringify({ mechanicName: null, elevators: [] }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: elevs } = await supabase.from('elevators')
      .select('*')
      .eq('mechanic_name', mName)
      .eq('status', 'montagem')
      .order('expected_end_date', { ascending: true });

    return new Response(JSON.stringify({ mechanicName: mName, elevators: elevs || [] }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error getting mechanic data:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
