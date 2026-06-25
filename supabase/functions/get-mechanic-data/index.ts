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

    const searchId = String(telegramId).trim();
    const mNames: string[] = [];
    
    const { data: profiles } = await supabase.from('user_profiles').select('full_name').eq('telegram_id', searchId);
    if (profiles) profiles.forEach((p: any) => { if (p.full_name) mNames.push(p.full_name) });
    
    const { data: techs } = await supabase.from('tecnicos_empresas').select('nome').eq('telegram_id', searchId);
    if (techs) techs.forEach((t: any) => { if (t.nome) mNames.push(t.nome) });

    const validNames = [...new Set(mNames)];
    const orParts = [`mestre_telegram.eq.${searchId}`];
    validNames.forEach(name => {
      orParts.push(`mechanic_name.ilike.%${name}%`);
    });
    const orConditions = orParts.join(',');

    const { data: elevs } = await supabase.from('elevators')
      .select('*')
      .or(orConditions)
      .eq('status', 'montagem')
      .order('expected_end_date', { ascending: true });

    const displayName = validNames[0];

    return new Response(JSON.stringify({ 
      mechanicName: displayName, 
      elevators: elevs || [],
      debug: { searchId, validNames, foundElevsLength: elevs?.length || 0 }
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error getting mechanic data:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
