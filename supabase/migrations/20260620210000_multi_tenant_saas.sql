-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. Insert the default tenant
INSERT INTO public.tenants (name, status) VALUES ('TKELEVATOR BR', 'active');

-- 3. Get the default tenant ID (for use in migration)
DO $$
DECLARE
  default_tenant_id uuid;
BEGIN
  SELECT id INTO default_tenant_id FROM public.tenants WHERE name = 'TKELEVATOR BR' LIMIT 1;

  -- 4. Add tenant_id to main tables and update existing records
  
  -- user_profiles
  ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
  UPDATE public.user_profiles SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  -- user_profiles is used in RLS. We can't set NOT NULL safely without fixing signup if we allow public signup. For now, let's keep it nullable or SET NOT NULL if all users have it.
  ALTER TABLE public.user_profiles ALTER COLUMN tenant_id SET NOT NULL;

  -- elevators
  ALTER TABLE public.elevators ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
  UPDATE public.elevators SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  ALTER TABLE public.elevators ALTER COLUMN tenant_id SET NOT NULL;

  -- empresas_contratadas
  ALTER TABLE public.empresas_contratadas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
  UPDATE public.empresas_contratadas SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  ALTER TABLE public.empresas_contratadas ALTER COLUMN tenant_id SET NOT NULL;

  -- tecnicos_empresas
  ALTER TABLE public.tecnicos_empresas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
  UPDATE public.tecnicos_empresas SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  ALTER TABLE public.tecnicos_empresas ALTER COLUMN tenant_id SET NOT NULL;

  -- tickets
  ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
  UPDATE public.tickets SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  ALTER TABLE public.tickets ALTER COLUMN tenant_id SET NOT NULL;

  -- companies
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
  UPDATE public.companies SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  ALTER TABLE public.companies ALTER COLUMN tenant_id SET NOT NULL;

END $$;

-- 5. Helper function to get the current user's tenant_id securely
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid();
$$;

-- Helper function to check if user is super_admin
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

-- We will set existing users to super_admin so the current owner is not locked out
UPDATE public.user_profiles SET is_super_admin = true;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(is_super_admin, false) FROM public.user_profiles WHERE id = auth.uid();
$$;

-- 6. Apply RLS Policies

-- tenants table: only super admins can manage, users can view their own
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.tenants;
CREATE POLICY "Super admins can do anything on tenants" ON public.tenants FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "Users can view their own tenant" ON public.tenants FOR SELECT TO authenticated USING (id = public.get_auth_tenant_id());

-- Drop old policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('user_profiles', 'elevators', 'empresas_contratadas', 'tecnicos_empresas', 'tickets', 'companies', 'pre_installation_checklists', 'assembly_checklists', 'adjustment_checklists', 'elevator_history', 'previsoes_entrega')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Create New Tenant-Aware Policies
-- user_profiles
CREATE POLICY "Tenant isolation for user_profiles" ON public.user_profiles 
  FOR ALL TO authenticated 
  USING (tenant_id = public.get_auth_tenant_id() OR public.is_super_admin());

-- elevators
CREATE POLICY "Tenant isolation for elevators" ON public.elevators 
  FOR ALL TO authenticated 
  USING (tenant_id = public.get_auth_tenant_id() OR public.is_super_admin());

-- empresas_contratadas
CREATE POLICY "Tenant isolation for empresas_contratadas" ON public.empresas_contratadas 
  FOR ALL TO authenticated 
  USING (tenant_id = public.get_auth_tenant_id() OR public.is_super_admin());

-- tecnicos_empresas
CREATE POLICY "Tenant isolation for tecnicos_empresas" ON public.tecnicos_empresas 
  FOR ALL TO authenticated 
  USING (tenant_id = public.get_auth_tenant_id() OR public.is_super_admin());

-- tickets
CREATE POLICY "Tenant isolation for tickets" ON public.tickets 
  FOR ALL TO authenticated 
  USING (tenant_id = public.get_auth_tenant_id() OR public.is_super_admin());

-- companies
CREATE POLICY "Tenant isolation for companies" ON public.companies 
  FOR ALL TO authenticated 
  USING (tenant_id = public.get_auth_tenant_id() OR public.is_super_admin());

-- Sub-tables (Checklists, etc) - they join via elevator_id
ALTER TABLE public.pre_installation_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assembly_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adjustment_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elevator_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.previsoes_entrega ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for pre_installation_checklists" ON public.pre_installation_checklists 
  FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.elevators WHERE id = elevator_id AND (tenant_id = public.get_auth_tenant_id() OR public.is_super_admin())));

CREATE POLICY "Tenant isolation for assembly_checklists" ON public.assembly_checklists 
  FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.elevators WHERE id = elevator_id AND (tenant_id = public.get_auth_tenant_id() OR public.is_super_admin())));

CREATE POLICY "Tenant isolation for adjustment_checklists" ON public.adjustment_checklists 
  FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.elevators WHERE id = elevator_id AND (tenant_id = public.get_auth_tenant_id() OR public.is_super_admin())));

CREATE POLICY "Tenant isolation for elevator_history" ON public.elevator_history 
  FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.elevators WHERE id = elevator_id AND (tenant_id = public.get_auth_tenant_id() OR public.is_super_admin())));

CREATE POLICY "Tenant isolation for previsoes_entrega" ON public.previsoes_entrega 
  FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.elevators WHERE id = elevator_id AND (tenant_id = public.get_auth_tenant_id() OR public.is_super_admin())));
