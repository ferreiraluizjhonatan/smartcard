import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface Tenant {
  id: string;
  name: string;
  status: string;
}

interface TenantContextType {
  activeTenantId: string | null;
  setActiveTenantId: (id: string | null) => void;
  tenants: Tenant[];
  loadingTenants: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);

  useEffect(() => {
    const fetchTenants = async () => {
      setLoadingTenants(true);
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { data: profile } = await supabase.from('user_profiles').select('is_super_admin, role').eq('id', user.user.id).single();
        if (profile?.is_super_admin || profile?.role === 'supervisor' || profile?.role === 'coordenador_nacional') {
          const { data } = await supabase.from('tenants').select('*').order('name');
          if (data) {
            setTenants(data);
          }
        }
      }
      setLoadingTenants(false);
    };
    
    fetchTenants();
  }, []);

  return (
    <TenantContext.Provider value={{ activeTenantId, setActiveTenantId, tenants, loadingTenants }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
