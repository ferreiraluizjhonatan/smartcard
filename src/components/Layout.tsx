import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogOut, Bell, Plus, Sparkles } from 'lucide-react';
import { AIChatModal } from './AIChatModal';

export default function Layout() {
  const [profile, setProfile] = useState<any>(null);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let subscription: any;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('user_profiles').select('*').eq('id', user.id).single()
          .then(({ data }) => {
             setProfile(data);
             if(data) {
                const fetchCount = () => {
                  supabase.from('tickets').select('id', { count: 'exact' })
                    .eq('company_id', data.company_id)
                    .neq('status', 'fechado')
                    .then(({ count }) => setOpenTicketsCount(count || 0));
                };
                
                fetchCount();

                // Subscribe to real-time changes
                subscription = supabase.channel(`public:tickets:${Date.now()}`)
                  .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, payload => {
                     fetchCount();
                  })
                  .subscribe();
             }
          });
      }
    });

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const roleNames: Record<string, string> = {
    coordenador_nacional: 'Master Admin',
    gerente_regional: 'Gerente Regional',
    coordenador_filial: 'Coordenador de Filial',
    gestor_equipe: 'Gestor Administrativo',
    supervisor: 'Supervisor',
    pre_instalador: 'Pré-Instalador',
    montador: 'Montador',
    ajustador: 'Ajustador'
  };

  return (
    <div className="app-layout">
      <header className="top-navbar">
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ marginRight: '16px', color: 'var(--accent-cyan)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div style={{ paddingTop: '8px', paddingBottom: '8px' }}>
            <h3 style={{ fontSize: '1.2rem', margin: 0, lineHeight: 1, letterSpacing: '0.5px' }}>Smartcard</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Gestão Ágil de Elevadores NI</span>
          </div>

          <nav className="nav-center">
            <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} end>
              Dashboard
            </NavLink>
            {profile?.can_register_users && (
              <>
                <NavLink to="/users" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                  Usuários
                </NavLink>
                <NavLink to="/companies" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                  Filiais
                </NavLink>
                <NavLink to="/empresas-contratadas" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                  Empresas Parceiras
                </NavLink>
                <button 
                  onClick={() => setIsAIModalOpen(true)}
                  className="nav-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
                >
                  Inteligência
                </button>
              </>
            )}
            <NavLink to="/elevators" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Obras
            </NavLink>
            <NavLink to="/tickets" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Chamados
            </NavLink>
          </nav>
        </div>

        <div className="nav-right">
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate('/tickets')}>
            <div style={{ 
              background: openTicketsCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)', 
              color: openTicketsCount > 0 ? 'var(--accent-red)' : 'var(--text-secondary)', 
              padding: '8px', 
              borderRadius: '50%',
              border: openTicketsCount > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)',
              transition: 'all 0.3s'
            }}>
              <Bell size={18} />
            </div>
            {openTicketsCount > 0 && (
              <span style={{ 
                position: 'absolute', top: '-4px', right: '-4px', 
                background: 'var(--accent-red)', color: 'white', 
                fontSize: '0.65rem', fontWeight: 'bold', 
                width: '16px', height: '16px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                borderRadius: '50%' 
              }}>{openTicketsCount}</span>
            )}
          </div>

          {profile?.can_register_users && (
            <button onClick={() => navigate('/users/new')} className="btn-glow" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} /> Novo Cadastro
            </button>
          )}

          <div className="profile-info">
            <span className="profile-name">{profile?.full_name || 'Carregando...'}</span>
            <span className="profile-role">
              👑 {profile ? roleNames[profile.role] : ''}
            </span>
          </div>

          <button onClick={handleLogout} className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
            <LogOut size={16} />
            <span className="hide-on-mobile">Sair</span>
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="page-container">
          <Outlet />
        </div>
      </main>

      <AIChatModal 
        isOpen={isAIModalOpen} 
        onClose={() => setIsAIModalOpen(false)}
        contextData={{
           view: 'Global Layout',
           user: profile?.full_name
        }}
      />
    </div>
  );
}
