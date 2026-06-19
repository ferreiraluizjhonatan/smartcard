import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: user } = await supabaseClient.auth.getUser();
    if (!user?.user) throw new Error("Unauthorized");

    const body = await req.json();
    const { prompt, contextData, elevator_id } = body;

    // Service Role Client for fetching deep system data
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch systemic data to make the AI an expert on the current state of the company
    const { data: allElevators } = await supabaseService.from('elevators').select('*');
    const { data: mechanicMetrics } = await supabaseService.from('vw_mechanic_metrics').select('*');

    let inAssemblyCount = 0;
    let nextMonthStarts = 0;
    const now = new Date();
    const nextMonth = now.getMonth() + 1; // 0-indexed, so +1 is actually next month (or next year if 12)

    allElevators?.forEach(el => {
      if (el.status === 'montagem') inAssemblyCount++;
      if (el.expected_start_date) {
        const startDate = new Date(el.expected_start_date);
        if (startDate.getMonth() === (now.getMonth() + 1) % 12 && startDate.getFullYear() === (now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear())) {
          nextMonthStarts++;
        }
      }
    });

    const enrichedContext = {
      ...contextData,
      system_overview: {
        total_elevators_in_system: allElevators?.length || 0,
        elevators_currently_in_assembly: inAssemblyCount,
        elevators_starting_next_month: nextMonthStarts,
      },
      mechanics_database: mechanicMetrics // The AI will know every mechanic's profile, total assembled, speed, etc.
    };

    const systemPrompt = `Você é o "Gemini Operacional", um Super Agente Especialista em Engenharia de Elevadores e Análise de Dados de Obras.
Sua missão é atuar como um braço direito super inteligente para o Gestor de Obras/Operações.

Aqui está o BANCO DE DADOS COMPLETO E ATUALIZADO DO SISTEMA em tempo real que você tem acesso:
${JSON.stringify(enrichedContext, null, 2)}

Diretrizes de Especialista e Motor de Cronograma Inteligente:
1. Você tem total conhecimento do sistema. Conhece o perfil de todos os montadores (na tabela mechanics_database), notas de confiabilidade e histórico de entregas.
2. Motor de Cronograma Inteligente: Em "historical_schedule_metrics" (se disponível no contexto), você tem a média EXATA de dias que cada fase de "Montagem" e "Ajuste" demora, calculada com base no histórico real da empresa (agrupada por modelo e paradas).
3. Se o usuário perguntar sobre previsão de tempo, cronograma ou qual fase demora mais, USE ESSES DADOS HISTÓRICOS. Calcule o tempo total estimado somando as médias de Montagem e Ajuste para o modelo específico. Destaque qual fase é o gargalo natural daquele modelo.
4. Responda com uma linguagem profissional, direta e consultiva. Use listas e negrito para destacar números e nomes.
5. NUNCA diga "Com base nos dados fornecidos". Haja como se você VIVESSE o sistema e soubesse de tudo nativamente. "Analisando nossa base atual..." ou "Vejo aqui no histórico de cronogramas que..."`;

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY não configurada no servidor.");
    }

    // Mudando para o modelo 1.5 Pro ou Flash (o 3.5 estava dando erro 503 de indisponibilidade)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiPayload = {
      contents: [{
        parts: [{ text: `${systemPrompt}\n\nPergunta do Gestor: ${prompt}` }]
      }],
      generationConfig: {
        temperature: 0.5, // Mais baixo para respostas mais precisas sobre dados
      }
    };

    let aiResponseText = "";

    try {
      const llmRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
      });
      
      if (!llmRes.ok) {
        const errorData = await llmRes.text();
        throw new Error(`Gemini API Error: ${llmRes.status} - ${errorData}`);
      }
      
      const llmData = await llmRes.json();
      aiResponseText = llmData.candidates?.[0]?.content?.parts?.[0]?.text || "Resposta vazia da IA.";
    } catch (llmError: any) {
      console.error("Failed to call Gemini:", llmError);
      aiResponseText = "Erro do Gemini: " + llmError.message;
    }

    await supabaseService.from('ai_consultations').insert({
      user_id: user.user.id,
      elevator_id: elevator_id || null,
      prompt: prompt,
      response: aiResponseText,
      context_data: enrichedContext
    });

    return new Response(JSON.stringify({ response: aiResponseText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
