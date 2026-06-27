ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS telegram_bot_token text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS whatsapp_api_key text;
