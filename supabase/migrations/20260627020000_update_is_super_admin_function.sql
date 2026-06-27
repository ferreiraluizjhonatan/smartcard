-- Allow supervisor to act as super admin in RLS
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND (is_super_admin = true OR role = 'supervisor' OR role = 'coordenador_nacional')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
