CREATE TABLE IF NOT EXISTS public.empresas_contratadas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT NOT NULL,
    cnpj TEXT UNIQUE NOT NULL,
    responsavel TEXT NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT NOT NULL,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    observacoes TEXT,
    status TEXT DEFAULT 'Ativa',
    regiao_id UUID,
    filial_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tecnicos_empresas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas_contratadas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    matricula TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT NOT NULL,
    telegram_id TEXT,
    funcao TEXT NOT NULL,
    status TEXT DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.empresas_contratadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnicos_empresas ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (as regras finas serão aplicadas no front-end para este MVP, mas todos os autenticados podem interagir com as tabelas)
CREATE POLICY "Permitir leitura para autenticados" ON public.empresas_contratadas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir tudo para autenticados" ON public.empresas_contratadas FOR ALL TO authenticated USING (true);

CREATE POLICY "Permitir leitura para autenticados" ON public.tecnicos_empresas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir tudo para autenticados" ON public.tecnicos_empresas FOR ALL TO authenticated USING (true);
