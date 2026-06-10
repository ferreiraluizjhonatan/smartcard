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
       .select('*')
       .eq('id', elevator_id)
       .single();

    if (elError || !elevator) {
       return new Response(JSON.stringify({ error: "Elevator not found" }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch total checklists for this elevator
    const [preInst, assem, adjust] = await Promise.all([
      supabase.from('pre_installation_checklists').select('id, percentage').eq('elevator_id', elevator_id),
      supabase.from('assembly_checklists').select('id, percentage').eq('elevator_id', elevator_id),
      supabase.from('adjustment_checklists').select('id, percentage').eq('elevator_id', elevator_id)
    ]);

    const totalChecklists = (preInst.data?.length || 0) + (assem.data?.length || 0) + (adjust.data?.length || 0);
    const allCurrentChecklists = [...(preInst.data || []), ...(assem.data || []), ...(adjust.data || [])];
    const completedNow = allCurrentChecklists.filter(c => c.percentage === 100).length;
    
    // Fetch logs
    const { data: logs } = await supabase
       .from('checklist_progress_log')
       .select('*')
       .eq('elevator_id', elevator_id)
       .order('created_at', { ascending: true });

    // Group by week
    const weeklyData: any[] = [];
    
    // Determine start date (use elevator start_date, or created_at, or first log date)
    let startDate = new Date(elevator.start_date || elevator.created_at);
    if (logs && logs.length > 0) {
       const firstLogDate = new Date(logs[0].created_at);
       if (firstLogDate < startDate) {
           startDate = firstLogDate;
       }
    }

    const endDate = new Date();
    let currentChunkStart = new Date(startDate);
    currentChunkStart.setHours(0,0,0,0);
    
    let expectedEndDate = elevator.expected_end_date ? new Date(elevator.expected_end_date) : null;
    let totalDays = expectedEndDate ? Math.max(1, Math.ceil((expectedEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))) : 30; // default 30 se sem prazo

    let weekNumber = 1;
    let maxLoop = 52; 
    
    const stateTracker = new Map<string, number>();

    while (currentChunkStart <= endDate && maxLoop > 0) {
       maxLoop--;
       const chunkEnd = new Date(currentChunkStart);
       chunkEnd.setDate(chunkEnd.getDate() + 7);
       
       if (logs) {
           for (const log of logs) {
               const logDate = new Date(log.created_at);
               if (logDate <= chunkEnd) {
                   stateTracker.set(log.item_id, log.percentage);
               }
           }
       }
       
       let completedCount = 0;
       stateTracker.forEach(val => {
           if (val === 100) completedCount++;
       });
       
       const realizedPercentage = totalChecklists > 0 ? Math.round((completedCount / totalChecklists) * 100) : 0;
       
       const daysPassed = Math.ceil((chunkEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
       let expectedPerc = Math.round((daysPassed / totalDays) * 100);
       if (expectedPerc > 100) expectedPerc = 100;
       if (expectedPerc < 0) expectedPerc = 0;

       weeklyData.push({
           week: `SEMANA ${weekNumber}`,
           dateStr: chunkEnd.toLocaleDateString('pt-BR'),
           realizado: realizedPercentage,
           esperado: expectedPerc
       });

       currentChunkStart.setDate(currentChunkStart.getDate() + 7);
       weekNumber++;
    }

    const currentRealized = totalChecklists > 0 ? Math.round((completedNow / totalChecklists) * 100) : 0;
    const daysPassedNow = Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    let expectedPercNow = Math.round((daysPassedNow / totalDays) * 100);
    if (expectedPercNow > 100) expectedPercNow = 100;
    if (expectedPercNow < 0) expectedPercNow = 0;

    if (weeklyData.length > 0) {
        weeklyData[weeklyData.length - 1].realizado = currentRealized;
        weeklyData[weeklyData.length - 1].esperado = expectedPercNow;
        weeklyData[weeklyData.length - 1].dateStr = new Date().toLocaleDateString('pt-BR');
    } else {
        weeklyData.push({
            week: `SEMANA 1`,
            dateStr: new Date().toLocaleDateString('pt-BR'),
            realizado: currentRealized,
            esperado: expectedPercNow
        });
    }

    const payload = {
        elevator,
        totalChecklists,
        completedChecklists: completedNow,
        currentRealized,
        weeklyData,
        daysPassed: daysPassedNow
    };

    return new Response(JSON.stringify(payload), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
