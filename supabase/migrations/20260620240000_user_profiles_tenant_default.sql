ALTER TABLE public.user_profiles ALTER COLUMN tenant_id SET DEFAULT public.get_auth_tenant_id();
