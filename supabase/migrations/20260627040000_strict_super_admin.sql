-- Remove is_super_admin from everyone
UPDATE public.user_profiles
SET is_super_admin = false;

-- Grant is_super_admin only to jhonatanfluiz@gmail.com
UPDATE public.user_profiles
SET is_super_admin = true,
    role = 'supervisor'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'jhonatanfluiz@gmail.com'
);
