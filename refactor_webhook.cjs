const fs = require('fs');

let content = fs.readFileSync('supabase/functions/chatbot-webhook/index.ts', 'utf8');

// Remove global TELEGRAM_TOKEN
content = content.replace(
  "const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';",
  "// TELEGRAM_TOKEN is now dynamic per tenant"
);

// Update sendTelegramMessage signature
content = content.replace(
  "async function sendTelegramMessage(chatId: string, text: string, reply_markup?: any) {",
  "async function sendTelegramMessage(chatId: string, text: string, botToken: string, reply_markup?: any) {"
);
content = content.replace(
  "const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;",
  "const url = `https://api.telegram.org/bot${botToken}/sendMessage`;"
);

// Update processMessage signature
content = content.replace(
  "async function processMessage(senderId: string, text: string, platform: 'telegram' | 'whatsapp') {",
  "async function processMessage(senderId: string, text: string, platform: 'telegram' | 'whatsapp', botToken: string) {"
);

// In processMessage, update all sendTelegramMessage calls
content = content.replace(/await sendTelegramMessage\(senderId, (.*?)\);/g, "await sendTelegramMessage(senderId, $1, botToken);");
// Update calls with reply_markup
content = content.replace(/await sendTelegramMessage\(senderId, (.*?), \{/g, "await sendTelegramMessage(senderId, $1, botToken, {");

// In serve, fetch tenant_id and botToken
const serveStart = `serve(async (req) => {
  try {
    const url = new URL(req.url);
    const tenant_id = url.searchParams.get('tenant_id');
    let botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
    
    if (tenant_id) {
      const { data: tenant } = await supabase.from('tenants').select('telegram_bot_token').eq('id', tenant_id).single();
      if (tenant && tenant.telegram_bot_token) {
        botToken = tenant.telegram_bot_token;
      }
    }
    
    if (!botToken) {
      console.error('No bot token found for tenant:', tenant_id);
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();`;

content = content.replace(
  `serve(async (req) => {\n  try {\n    const body = await req.json();`,
  serveStart
);

// Update calls in serve
content = content.replace(
  "await processMessage(chatId, text, 'telegram');",
  "await processMessage(chatId, text, 'telegram', botToken);"
);
content = content.replace(
  "await processMessage(chatId, data, 'telegram');",
  "await processMessage(chatId, data, 'telegram', botToken);"
);
content = content.replace(
  "await processMessage(fromNumber, text, 'whatsapp');",
  "await processMessage(fromNumber, text, 'whatsapp', botToken);"
);
content = content.replace(
  "await sendTelegramMessage(chatId, \"Buscando atualizações na sua obra...\");",
  "await sendTelegramMessage(chatId, \"Buscando atualizações na sua obra...\", botToken);"
);
content = content.replace(
  "https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery",
  "https://api.telegram.org/bot${botToken}/answerCallbackQuery"
);

fs.writeFileSync('supabase/functions/chatbot-webhook/index.ts', content);
console.log('Successfully updated chatbot-webhook');
