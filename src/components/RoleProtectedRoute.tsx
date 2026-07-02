import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface RoleProtectedRouteProps {
  requiredPermission?: string;
  requireSuperAdmin?: boolean;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  requiredPermission, 
  requireSuperAdmin = false 
}) => {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAllowed(false);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) {
        setIsAllowed(false);
        return;
      }

      if (requireSuperAdmin && profile.is_super_admin) {
        setIsAllowed(true);
        return;
      }

      if (requireSuperAdmin && !profile.is_super_admin) {
        setIsAllowed(false);
        return;
      }

      if (requiredPermission && profile[requiredPermission]) {
        setIsAllowed(true);
        return;
      }
      
      if (requiredPermission && !profile[requiredPermission] && !profile.is_super_admin) {
        setIsAllowed(false);
        return;
      }

      setIsAllowed(true);
    };

    checkAccess();
  }, [requiredPermission, requireSuperAdmin]);

  if (isAllowed === null) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Carregando permissões...</div>;
  }

  return isAllowed ? <Outlet /> : <Navigate to='/' replace />;
};
