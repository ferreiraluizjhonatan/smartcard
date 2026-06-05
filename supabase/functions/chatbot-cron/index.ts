import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendTelegramMessage(chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const json = await res.json();
  console.log('Telegram response:', json);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let reqBody: any = {};
    if (req.method === 'POST') {
      try {
        reqBody = await req.json();
      } catch (e) {
        console.warn("Could not parse JSON body in chatbot-cron:", e);
      }
    }

    if (reqBody.action === 'notify_delivery' && reqBody.elevator) {
       const { data: managers } = await supabase.from('user_profiles').select('telegram_id')
         .in('role', ['supervisor', 'gestor_equipe', 'coordenador_filial', 'gerente_regional', 'coordenador_nacional'])
         .not('telegram_id', 'is', null);

       if (managers && managers.length > 0) {
         const msg = `🏆 *Elevador entregue ao cliente*\n\nObra: ${reqBody.elevator.name}\nCliente: ${reqBody.elevator.customer || 'Não informado'}\nData: ${new Date(reqBody.elevator.date).toLocaleString('pt-BR')}\nResponsável: ${reqBody.elevator.user}\nStatus: Entregue`;
         
         for (const m of managers) {
            await sendTelegramMessage(m.telegram_id, msg);
         }
       }
       return new Response("Notified delivery", { status: 200, headers: corsHeaders });
    }

    let query = supabase.from('elevators')
      .select('*')
      .in('status', ['pre_instalacao', 'montagem']);
      
    if (reqBody.elevator_id) {
      query = query.eq('id', reqBody.elevator_id);
    }

    const { data: elevators, error: queryError } = await query;
    if (queryError) {
      console.error('Query error:', queryError);
    }

    if (!elevators) {
      return new Response("No elevators found", { status: 200, headers: corsHeaders });
    }

    let messagesSent = 0;
    const userGroups = new Map<string, { user: any, pendingTasks: any[] }>();

    // Pass 1: Group pending tasks by user
    for (const elevator of (elevators || [])) {
      const projectName = elevator.project_name || 'Obra';
      const equipmentId = elevator.equipment_id || 'N/A';
      const projectDisplayName = `${projectName} (Equip: ${equipmentId})`;
      
      let targetUser = null;
      let tableName = '';

      if (elevator.status === 'pre_instalacao') {
        if (!elevator.mestre_telegram) continue;
        targetUser = {
          id: null,
          telegram_id: elevator.mestre_telegram,
          whatsapp_number: elevator.mestre_telefone || null,
          full_name: elevator.mestre_nome || 'Mestre'
        };
        tableName = 'pre_installation_checklists';
      } else if (elevator.status === 'montagem') {
        if (!elevator.mechanic_name) continue;
        let user = null;
        if (elevator.empresa_contratada_id) {
          const { data } = await supabase.from('tecnicos_empresas')
            .select('*')
            .eq('nome', elevator.mechanic_name)
            .eq('empresa_id', elevator.empresa_contratada_id)
            .single();
          if (data) {
             user = {
               id: null,
               telegram_id: data.telegram_id,
               whatsapp_number: data.telefone,
               full_name: data.nome
             };
          }
        } else {
          const { data } = await supabase.from('user_profiles')
            .select('*')
            .eq('full_name', elevator.mechanic_name)
            .single();
          user = data;
        }
        targetUser = user;
        tableName = 'assembly_checklists';
      }

      if (!targetUser) continue;
      if (reqBody.telegram_id && targetUser.telegram_id !== reqBody.telegram_id) continue;

      const hasTelegram = !!targetUser.telegram_id;
      const hasWhatsapp = !!targetUser.whatsapp_number;
      if (!hasTelegram && !hasWhatsapp) continue;

      const contactId = hasTelegram ? targetUser.telegram_id : targetUser.whatsapp_number;

      const { data: checklists } = await supabase.from(tableName)
        .select('*')
        .eq('elevator_id', elevator.id)
        .order('id', { ascending: true });
        
      if (!checklists || checklists.length === 0) continue;

      const firstPendingIndex = checklists.findIndex((c: any) => c.percentage !== 100);
      if (firstPendingIndex === -1) continue; // All done

      if (!userGroups.has(contactId)) {
        userGroups.set(contactId, { user: targetUser, pendingTasks: [] });
      }
      
      userGroups.get(contactId)!.pendingTasks.push({
        elevator,
        projectDisplayName,
        checklists,
        firstPendingIndex,
        tableName
      });
    }

    // Pass 2: Send messages per user
    for (const [contactId, group] of userGroups.entries()) {
      const { user, pendingTasks } = group;
      const hasTelegram = !!user.telegram_id;
      const hasWhatsapp = !!user.whatsapp_number;
      
      const roleGreeting = user.full_name.split(' ')[0] || 'Amigo';
      
      if (pendingTasks.length === 1) {
        // Only 1 pending elevator, go straight to the checklist
        const task = pendingTasks[0];
        const phase = task.elevator.status.replace('_', ' ').toUpperCase();
        
        await supabase.from('bot_states').insert({
          telegram_id: hasTelegram ? user.telegram_id : null,
          whatsapp_number: hasWhatsapp && !hasTelegram ? user.whatsapp_number : null,
          user_id: user.id,
          elevator_id: task.elevator.id,
          current_step: 'asking_checklist_execution',
          metadata: {
             items: task.checklists,
             currentIndex: task.firstPendingIndex,
             projectName: task.projectDisplayName
          }
        });

        const msg = `Fala, ${roleGreeting}! Tudo bem? 👷‍♂️\n\nEstou passando pra gente dar aquela atualizada rápida na obra *${task.projectDisplayName}* (Fase: ${phase}).`;
        
        if (hasTelegram) {
          const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
          await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: user.telegram_id, text: msg }) });
          
          const firstItem = task.checklists[task.firstPendingIndex];
          const questionMsg = `🏢 Obra: *${task.projectDisplayName}*\n📌 Fase ${task.firstPendingIndex + 1}/${task.checklists.length} – *${firstItem.item_name}*\n\nA atividade foi executada?`;
          await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              chat_id: user.telegram_id, text: questionMsg, parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: [[{ text: 'SIM', callback_data: 'YES' }], [{ text: 'NÃO', callback_data: 'NO' }]] }
            }),
          });
          messagesSent++;
        }
      } else {
        // Multiple pending elevators, ask which one to update
        await supabase.from('bot_states').insert({
          telegram_id: hasTelegram ? user.telegram_id : null,
          whatsapp_number: hasWhatsapp && !hasTelegram ? user.whatsapp_number : null,
          user_id: user.id,
          current_step: 'choosing_elevator',
          metadata: { pendingTasks }
        });

        const msg = `Fala, ${roleGreeting}! Tudo bem? 👷‍♂️\n\nVi aqui que você tem ${pendingTasks.length} obras com pendências de atualização.\n\nQual delas você quer atualizar agora?`;
        
        if (hasTelegram) {
          const buttons = pendingTasks.map((task: any, index: number) => {
             return [{ text: task.projectDisplayName, callback_data: `CHOOSE_ELEV_${index}` }];
          });

          const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
          await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              chat_id: user.telegram_id, text: msg, parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: buttons }
            }),
          });
          messagesSent++;
        }
      }
    }

    if (reqBody && reqBody.telegram_id && messagesSent === 0) {
      await sendTelegramMessage(reqBody.telegram_id, `Boas notícias! 🥳\n\nDei uma olhada aqui e não temos nenhuma pendência para você no momento. Suas obras estão todas com o cronograma em dia conosco!`);
    }

    return new Response(`Cron completed. ${messagesSent} messages sent.`, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error(error);
    return new Response(error.stack || error.message || "Internal Server Error", { status: 500, headers: corsHeaders });
  }
});
