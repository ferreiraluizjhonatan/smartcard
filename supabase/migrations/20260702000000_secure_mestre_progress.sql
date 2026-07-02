-- Drop insecure policies on mestre_progress
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.mestre_progress;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.mestre_progress;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.mestre_progress;

-- Create Tenant-Aware Policies for mestre_progress
CREATE POLICY "Tenant isolation for mestre_progress select" ON public.mestre_progress 
  FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.elevators WHERE id = elevator_id AND (tenant_id = public.get_auth_tenant_id() OR public.is_super_admin())));

CREATE POLICY "Tenant isolation for mestre_progress insert" ON public.mestre_progress 
  FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.elevators WHERE id = elevator_id AND (tenant_id = public.get_auth_tenant_id() OR public.is_super_admin())));

CREATE POLICY "Tenant isolation for mestre_progress update" ON public.mestre_progress 
  FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.elevators WHERE id = elevator_id AND (tenant_id = public.get_auth_tenant_id() OR public.is_super_admin())));
