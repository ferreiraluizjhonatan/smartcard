-- Add default value for tenant_id using the secure helper function
ALTER TABLE public.elevators ALTER COLUMN tenant_id SET DEFAULT public.get_auth_tenant_id();
ALTER TABLE public.empresas_contratadas ALTER COLUMN tenant_id SET DEFAULT public.get_auth_tenant_id();
ALTER TABLE public.tecnicos_empresas ALTER COLUMN tenant_id SET DEFAULT public.get_auth_tenant_id();
ALTER TABLE public.tickets ALTER COLUMN tenant_id SET DEFAULT public.get_auth_tenant_id();
ALTER TABLE public.companies ALTER COLUMN tenant_id SET DEFAULT public.get_auth_tenant_id();
