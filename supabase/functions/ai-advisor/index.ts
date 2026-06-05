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
    if (!user.user) throw new Error("Unauthorized");

    const body = await req.json();
    const { prompt, contextData, elevator_id } = body;

    // 1. Build the System Prompt with the contextual data
    const systemPrompt = `Você é um Analista de Inteligência Operacional especialista em obras de elevadores.
Use os dados abaixo para responder a pergunta do usuário de forma analítica e estratégica.

DADOS DE CONTEXTO:
${JSON.stringify(contextData, null, 2)}

Regras:
1. Responda de forma direta e objetiva.
2. Identifique gargalos e riscos se possível.
3. Não use jargões psicológicos, foque na execução e produtividade.`;

    // 2. Call Ollama (or future API)
    // Using host.docker.internal because Edge Functions run in docker locally, 
    // and need to reach the host's localhost (Ollama). 
    // In production, OLLAMA_URL or OPENAI_API_KEY should be configured.
    const llmEndpoint = Deno.env.get('OLLAMA_URL') || 'http://host.docker.internal:11434/api/generate';
    
    const ollamaPayload = {
      model: "llama3", // or any local model they have
      prompt: `${systemPrompt}\n\nPergunta do Gestor: ${prompt}`,
      stream: false
    };

    let aiResponseText = "";

    try {
      const llmRes = await fetch(llmEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ollamaPayload)
      });
      
      if (!llmRes.ok) {
        throw new Error(`LLM API Error: ${llmRes.statusText}`);
      }
      
      const llmData = await llmRes.json();
      aiResponseText = llmData.response;
    } catch (llmError) {
      console.error("Failed to call LLM:", llmError);
      aiResponseText = "Não foi possível conectar ao assistente de IA no momento. Por favor, verifique se o Ollama está rodando ou se a API está configurada corretamente.";
    }

    // 3. Save to database for future learning
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseService.from('ai_consultations').insert({
      user_id: user.user.id,
      elevator_id: elevator_id || null,
      prompt: prompt,
      response: aiResponseText,
      context_data: contextData
    });

    return new Response(JSON.stringify({ response: aiResponseText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
