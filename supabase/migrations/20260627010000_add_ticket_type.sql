-- Add ticket_type column to tickets table to distinguish between chamados, pendencias, and mensagens
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ticket_type text DEFAULT 'chamado';

-- Update existing records to assign the correct type based on their current title and context
-- 1. Messages from Client Portal
UPDATE public.tickets SET ticket_type = 'mensagem' WHERE title = 'Mensagem do Mestre (Link Público)';

-- 2. Pendencies from Checklists (Adicionar Pendência or No button)
UPDATE public.tickets SET ticket_type = 'pendencia' WHERE title LIKE 'Pendência%' OR (title NOT LIKE 'Problema:%' AND ticket_type != 'mensagem');

-- 3. Explicit Chamados (Abrir Chamado Oficial)
UPDATE public.tickets SET ticket_type = 'chamado' WHERE title LIKE 'Problema:%';
