import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendTelegramMessage(chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// Function to handle the state machine logic
async function processMessage(senderId: string, text: string, platform: 'telegram' | 'whatsapp') {
  const tLower = text.trim().toLowerCase();
  
  if (tLower === 'meu id' || tLower === '/id') {
    if (platform === 'telegram') {
      await sendTelegramMessage(senderId, `Seu ID do Telegram é: ${senderId}\n\nCopie este número e cole no seu cadastro de usuário no sistema Smart Card!`);
    }
    return;
  }

  // Check if user has an active bot state
  let stateQuery = supabase.from('bot_states').select('*, elevators(*)');
  if (platform === 'telegram') stateQuery = stateQuery.eq('telegram_id', senderId);
  else stateQuery = stateQuery.eq('whatsapp_number', senderId);

  const { data: states } = await stateQuery.order('updated_at', { ascending: false }).limit(1);
  
  // No active task? Just greet them and offer to sync, regardless of what they typed
  if (!states || states.length === 0) {
    if (platform === 'telegram') {
      const msg = `Olá! Que bom falar com você! 👋\n\nAqui é o assistente virtual da Smart Card, sempre pronto pra te ajudar a manter suas obras organizadas e em dia.\n\nVamos dar uma olhada se temos alguma atualização pra fazer hoje? Só clicar no botão abaixo! 👇`;
      const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: senderId, 
          text: msg,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Sincronizar / Atualizar Obras', callback_data: 'check_updates' }]
            ]
          }
        }),
      });
    }
    return;
  }

  const state = states[0];
  const elevator = state.elevators;
  const t = text.trim().toLowerCase();

  // Helper to send the sync menu
  async function sendSyncMenu(reason: string) {
    // Delete all pending states to prevent getting stuck
    let delQuery = supabase.from('bot_states').delete();
    if (platform === 'telegram') delQuery = delQuery.eq('telegram_id', senderId);
    else delQuery = delQuery.eq('whatsapp_number', senderId);
    await delQuery;

    const greeting = `${reason}\n\n👋 Olá! Bem-vindo ao assistente da Smart Card.\n\nPara verificar se há pendências nas suas obras ou iniciar suas atualizações, clique no botão abaixo:`;
    if (platform === 'telegram') {
      const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: senderId, 
          text: greeting,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Sincronizar / Atualizar Obras', callback_data: 'check_updates' }]
            ]
          }
        }),
      });
    }
  }

  // Helper to check for next questions
  async function checkAndSendNextState() {
    let nextQuery = supabase.from('bot_states').select('*, elevators(*)');
    if (platform === 'telegram') {
      nextQuery = nextQuery.eq('telegram_id', senderId);
    } else {
      nextQuery = nextQuery.eq('whatsapp_number', senderId);
    }
    
    // Pick oldest pending state
    const { data: nextStates } = await nextQuery.order('created_at', { ascending: true }).limit(1);
    
    if (nextStates && nextStates.length > 0) {
       const nextState = nextStates[0];
       const nextElevator = Array.isArray(nextState.elevators) ? nextState.elevators[0] : nextState.elevators;
       const projectName = nextElevator ? `${nextElevator.project_name || 'Obra'} (Equip: ${nextElevator.equipment_id || 'N/A'})` : 'Obra';
       
       if (nextState.current_step === 'asking_mechanic_percentage') {
          const phase = nextElevator ? nextElevator.status.replace('_', ' ').toUpperCase() : '';
          const msg = `Excelente! 🛠️\n\nAgora vamos atualizar a obra *${projectName}* (Fase: ${phase}).\n\nQual o progresso atual?`;
          if (platform === 'telegram') {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                chat_id: senderId, 
                text: msg,
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '✅ 100% (Concluído)', callback_data: '100' }],
                    [{ text: '🟦 75% Concluído', callback_data: '75' }],
                    [{ text: '🟨 50% Concluído', callback_data: '50' }],
                    [{ text: '🟧 25% Concluído', callback_data: '25' }],
                    [{ text: '⚪ 0% (Ainda não avancei)', callback_data: '0' }]
                  ]
                }
              })
            });
          }
       } else if (nextState.current_step === 'asking_checklist') {
          const msg = `Tudo certo! 👍\n\nAgora vamos para o checklist de segurança da obra *${projectName}*. Podemos começar?`;
          if (platform === 'telegram') {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                chat_id: senderId, 
                text: msg,
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '👍 Sim, começar checklist', callback_data: 'start_checklist' }]
                  ]
                }
              })
            });
          }
       }
    } else {
       // No more states
       const msg = `🎉 Tudo 100% atualizado!\n\nLembre-se de anexar fotos e ocorrências nos links que enviei.\n\nTenha um ótimo descanso e um excelente trabalho! 🚀`;
       if (platform === 'telegram') await sendTelegramMessage(senderId, msg);
    }
  }

  // STATE: choosing_elevator
  if (state.current_step === 'choosing_elevator') {
    if (!t.startsWith('choose_elev_')) {
      await sendSyncMenu("Por favor, selecione uma obra usando os botões acima.");
      return;
    }
    
    try {
      const index = parseInt(t.split('_')[2]);
      const md = state.metadata || {};
      const pendingTasks = md.pendingTasks || [];
      const chosenTask = pendingTasks[index];

      if (!chosenTask) {
         await sendSyncMenu("Opção inválida.");
         return;
      }

      // Delete the choosing state
      await supabase.from('bot_states').delete().eq('id', state.id);

      // Insert new state for the chosen elevator
      const { error: insertError } = await supabase.from('bot_states').insert({
        telegram_id: state.telegram_id,
        whatsapp_number: state.whatsapp_number,
        user_id: state.user_id,
        elevator_id: chosenTask.elevator.id,
        current_step: 'asking_checklist_execution',
        metadata: {
           items: chosenTask.checklists,
           currentIndex: chosenTask.firstPendingIndex,
           projectName: chosenTask.projectDisplayName
        }
      });
      
      if (insertError) {
        throw new Error("Erro ao inserir novo estado: " + insertError.message);
      }

      const firstItem = chosenTask.checklists[chosenTask.firstPendingIndex];
      const questionMsg = `Excelente escolha! 👍\n\n🏢 Obra: *${chosenTask.projectDisplayName}*\n📌 Fase ${chosenTask.firstPendingIndex + 1}/${chosenTask.checklists.length} – *${firstItem.item_name}*\n\nA atividade foi executada?`;
      
      if (platform === 'telegram') {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        const res = await fetch(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chat_id: senderId, text: questionMsg, parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: 'SIM', callback_data: 'YES' }], [{ text: 'NÃO', callback_data: 'NO' }]] }
          }),
        });
        
        const json = await res.json();
        if (!json.ok) {
           console.error("Telegram error:", json);
           // Fallback without Markdown
           await fetch(url, {
             method: 'POST', headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ 
               chat_id: senderId, text: questionMsg.replace(/\*/g, ''),
               reply_markup: { inline_keyboard: [[{ text: 'SIM', callback_data: 'YES' }], [{ text: 'NÃO', callback_data: 'NO' }]] }
             }),
           });
        }
      }
    } catch (err: any) {
      console.error(err);
      if (platform === 'telegram') {
        await sendTelegramMessage(senderId, `Ocorreu um erro ao processar sua escolha: ${err.message}`);
      }
    }
    return;
  }

  // STATE: asking_mechanic_percentage
  if (state.current_step === 'asking_mechanic_percentage') {
    const pctString = t.replace('%', '').trim();
    const percentage = parseInt(pctString);
    if (isNaN(percentage) || ![0, 25, 50, 75, 100].includes(percentage)) {
      // Not a valid answer. Clear state and show sync menu!
      await sendSyncMenu("Parece que você enviou uma mensagem de texto.");
      return;
    }

    // Delete state as we finished
    await supabase.from('bot_states').delete().eq('id', state.id);

    try {
      const elev = Array.isArray(elevator) ? elevator[0] : elevator;
      if (!elev) throw new Error("Elevator missing in state");
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://smartcard-git-main-ferreiraluizjhonatans-projects.vercel.app';
      const link = `${frontendUrl}/mecanico/${senderId}`;
      const projectName = `${elev.project_name || 'Obra'} (Equip: ${elev.equipment_id || 'N/A'})`;
      const msg = `Feito! Obra *${projectName}* atualizada para ${percentage}%.\n🔗 Seu Painel de Obras: ${link}`;
      if (platform === 'telegram') await sendTelegramMessage(senderId, msg);
    } catch (err) {
      console.error("Error finalizing mechanic percentage:", err);
      if (platform === 'telegram') await sendTelegramMessage(senderId, `Feito! Obra atualizada para ${percentage}%. Obrigado!`);
    }

    // Move to next question!
    await checkAndSendNextState();
    return;
  }

  // === MESTRE DE OBRAS STATES ===

  // === STATE: asking_checklist_execution ===
  if (state.current_step === 'asking_checklist_execution') {
    if (t !== 'yes' && t !== 'no') {
      await sendSyncMenu("Por favor, responda usando os botões SIM ou NÃO.");
      return;
    }

    const md = state.metadata || { items: [], currentIndex: 0, projectName: 'Obra' };
    const items = md.items;
    let currentIndex = md.currentIndex;
    const totalItems = items.length;

    if (items.length > 0 && currentIndex < items.length) {
       const currentItem = items[currentIndex];
       const elev = Array.isArray(elevator) ? elevator[0] : elevator;
       const tableName = elev.status === 'pre_instalacao' ? 'pre_installation_checklists' : 'assembly_checklists';
       const projectName = md.projectName;

       if (t === 'no') {
         // User clicked NO -> Not started, 0%
         await supabase.from(tableName).update({ percentage: 0, is_started: false }).eq('id', currentItem.id);
         currentIndex++;

         if (currentIndex < items.length) {
           // Move to NEXT item and ask execution
           await supabase.from('bot_states').update({ 
              metadata: { ...md, currentIndex }
           }).eq('id', state.id);

           const nextItem = items[currentIndex];
           const msg = `🏢 Obra: *${projectName}*\n📌 Fase ${currentIndex + 1}/${totalItems} – *${nextItem.item_name}*\n\nA atividade foi executada?`;
           
           if (platform === 'telegram') {
             const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
             await fetch(url, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ 
                 chat_id: senderId, 
                 text: msg,
                 parse_mode: 'Markdown',
                 reply_markup: {
                   inline_keyboard: [
                      [{ text: 'SIM', callback_data: 'YES' }],
                      [{ text: 'NÃO', callback_data: 'NO' }]
                   ]
                 }
               })
             });
           }
           return;
         }
       } else if (t === 'yes') {
         // User clicked YES -> Ask for Percentage for the SAME item
         await supabase.from('bot_states').update({ 
            current_step: 'asking_checklist_percentage'
         }).eq('id', state.id);

         const msg = `🏢 Obra: *${projectName}*\n📌 Fase ${currentIndex + 1}/${totalItems} – *${currentItem.item_name}*\n\nEscolha a evolução da atividade:`;
         
         if (platform === 'telegram') {
           const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
           await fetch(url, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ 
               chat_id: senderId, 
               text: msg,
               parse_mode: 'Markdown',
               reply_markup: {
                 inline_keyboard: [
                    [{ text: '✅ 100% (Concluído)', callback_data: '100' }],
                    [{ text: '🟦 75% Concluído', callback_data: '75' }],
                    [{ text: '🟨 50% Concluído', callback_data: '50' }],
                    [{ text: '🟧 25% Concluído', callback_data: '25' }]
                 ]
               }
             })
           });
         }
         return;
       }
    }

    // Finished all questions!
    await supabase.from('bot_states').delete().eq('id', state.id);

    try {
       const elev = Array.isArray(elevator) ? elevator[0] : elevator;
       if (!elev) throw new Error("Elevator missing in state");
       const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://smartcard-git-main-ferreiraluizjhonatans-projects.vercel.app';
       let link = `${frontendUrl}/tracking/${elev.id}`;
       if (elev.status === 'pre_instalacao' && elev.contract_number && String(elev.contract_number).trim() !== '') {
           link = `${frontendUrl}/mestre/${encodeURIComponent(String(elev.contract_number).trim())}`;
       } else if (elev.status === 'montagem') {
           link = `${frontendUrl}/mecanico/${senderId}`;
       }
       const projectName = md.projectName || `${elev.project_name || 'Obra'} (Equip: ${elev.equipment_id || 'N/A'})`;
       const msg = `Obrigado por completar o checklist da obra *${projectName}*!\n🔗 Seu Painel de Obras: ${link}`;
       if (platform === 'telegram') await sendTelegramMessage(senderId, msg);
    } catch (err) {
       console.error("Error finalizing checklist:", err);
       if (platform === 'telegram') await sendTelegramMessage(senderId, `Checklist finalizado com sucesso! Obrigado!`);
    }

    await checkAndSendNextState();
    return;
  }

  // === STATE: asking_checklist_percentage ===
  if (state.current_step === 'asking_checklist_percentage') {
    const pctString = t.replace('%', '').trim();
    const pct = parseInt(pctString);

    if (isNaN(pct) || ![25, 50, 75, 100].includes(pct)) {
      await sendSyncMenu("Por favor, selecione uma das opções de evolução clicando no botão.");
      return;
    }

    const md = state.metadata || { items: [], currentIndex: 0, projectName: 'Obra' };
    const items = md.items;
    let currentIndex = md.currentIndex;
    const totalItems = items.length;

    if (items.length > 0 && currentIndex < items.length) {
       const currentItem = items[currentIndex];
       const elev = Array.isArray(elevator) ? elevator[0] : elevator;
       const tableName = elev.status === 'pre_instalacao' ? 'pre_installation_checklists' : 'assembly_checklists';
       const projectName = md.projectName;

       // Save percentage
       await supabase.from(tableName).update({ percentage: pct, is_started: true }).eq('id', currentItem.id);
       
       currentIndex++;

       if (currentIndex < items.length) {
         // Ask execution for the NEXT item
         await supabase.from('bot_states').update({ 
            current_step: 'asking_checklist_execution',
            metadata: { ...md, currentIndex }
         }).eq('id', state.id);

         const nextItem = items[currentIndex];
         const msg = `Anotado! 📝\n\n🏢 Obra: *${projectName}*\n📌 Fase ${currentIndex + 1}/${totalItems} – *${nextItem.item_name}*\n\nA atividade foi executada?`;
         
         if (platform === 'telegram') {
           const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
           await fetch(url, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ 
               chat_id: senderId, 
               text: msg,
               parse_mode: 'Markdown',
               reply_markup: {
                 inline_keyboard: [
                    [{ text: 'SIM', callback_data: 'YES' }],
                    [{ text: 'NÃO', callback_data: 'NO' }]
                 ]
               }
             })
           });
         }
         return;
       }
    }

    // Finished all questions!
    await supabase.from('bot_states').delete().eq('id', state.id);

    try {
       const elev = Array.isArray(elevator) ? elevator[0] : elevator;
       if (!elev) throw new Error("Elevator missing in state");
       const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://smartcard-git-main-ferreiraluizjhonatans-projects.vercel.app';
       let link = `${frontendUrl}/tracking/${elev.id}`;
       if (elev.status === 'pre_instalacao' && elev.contract_number && String(elev.contract_number).trim() !== '') {
           link = `${frontendUrl}/mestre/${encodeURIComponent(String(elev.contract_number).trim())}`;
       } else if (elev.status === 'montagem') {
           link = `${frontendUrl}/mecanico/${senderId}`;
       }
       const projectName = md.projectName || `${elev.project_name || 'Obra'} (Equip: ${elev.equipment_id || 'N/A'})`;
       const msg = `Obrigado por atualizar a evolução da obra *${projectName}*!\n🔗 Seu Painel de Obras: ${link}`;
       if (platform === 'telegram') await sendTelegramMessage(senderId, msg);
    } catch (err) {
       console.error("Error finalizing checklist:", err);
       if (platform === 'telegram') await sendTelegramMessage(senderId, `Checklist finalizado com sucesso! Obrigado!`);
    }

    await checkAndSendNextState();
    return;
  }
}

serve(async (req) => {
  try {
    const body = await req.json();

    // === TELEGRAM WEBHOOK LOGIC ===
    if (body.message && body.message.chat && body.message.text) {
      const chatId = body.message.chat.id.toString();
      const text = body.message.text;
      await processMessage(chatId, text, 'telegram');
      return new Response("OK", { status: 200 });
    }

    if (body.callback_query && body.callback_query.message) {
      const chatId = body.callback_query.message.chat.id.toString();
      const data = body.callback_query.data; 

      // Answer callback query to remove loading state from the button
      const ansUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`;
      await fetch(ansUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: body.callback_query.id }),
      });

      if (data === 'check_updates') {
        await sendTelegramMessage(chatId, "Buscando atualizações na sua obra...");
        
        // Trigger cron synchronously so the edge function doesn't kill the request
        const cronUrl = `https://jmwbjvogmslpftkxsgyl.supabase.co/functions/v1/chatbot-cron`;
        try {
          await fetch(cronUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
            },
            body: JSON.stringify({ telegram_id: chatId })
          });
        } catch (err) {
          console.error("Error triggering cron:", err);
        }

        // Let telegram know we received it
        return new Response("OK", { status: 200 });
      }

      await processMessage(chatId, data, 'telegram');
      return new Response("OK", { status: 200 });
    }

    // === WHATSAPP WEBHOOK LOGIC (Placeholder for Meta/Evolution API) ===
    // This depends on the specific WhatsApp API structure
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
      const waMessage = body.entry[0].changes[0].value.messages[0];
      const fromNumber = waMessage.from; // Sender number
      const text = waMessage.text?.body;
      if (text) {
        await processMessage(fromNumber, text, 'whatsapp');
      }
      return new Response("OK", { status: 200 });
    }

    return new Response("Webhook received", { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
