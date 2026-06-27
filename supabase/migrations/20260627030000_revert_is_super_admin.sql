-- Revert is_super_admin to strict check
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant is_super_admin only to jhonatanfluiz@gmail.com
UPDATE public.user_profiles
SET is_super_admin = true,
    role = 'supervisor'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'jhonatanfluiz@gmail.com'
);
