import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogOut, Bell, Plus, Sparkles, MessageSquare, Menu, X } from 'lucide-react';
import { AIChatModal } from './AIChatModal';
import { useTenant } from '../contexts/TenantContext';
import { getTenantConfig } from '../config/tenantConfig';

export default function Layout() {
  const [profile, setProfile] = useState<any>(null);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [openMessagesCount, setOpenMessagesCount] = useState(0);
  const navigate = useNavigate();
  const { activeTenantId, setActiveTenantId, tenants, loadingTenants } = useTenant();
  const tenantConfig = getTenantConfig(activeTenantId || profile?.tenant_id);

  useEffect(() => {
    let subscription: any;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('user_profiles').select('*').eq('id', user.id).single()
          .then(({ data }) => {
             setProfile(data);
             if(data) {
                const fetchCount = () => {
                  let qTickets = supabase.from('tickets').select('id', { count: 'exact' })
                    .eq('ticket_type', 'chamado')
                    .neq('status', 'fechado');
                  
                  let qMessages = supabase.from('tickets').select('id', { count: 'exact' })
                    .eq('ticket_type', 'mensagem')
                    .neq('status', 'fechado');
                    
                  if (activeTenantId) {
                    qTickets = qTickets.eq('tenant_id', activeTenantId);
                    qMessages = qMessages.eq('tenant_id', activeTenantId);
                  } else {
                    qTickets = qTickets.eq('company_id', data.company_id);
                    qMessages = qMessages.eq('company_id', data.company_id);
                  }
                  
                  qTickets.then(({ count }) => setOpenTicketsCount(count || 0));
                  qMessages.then(({ count }) => setOpenMessagesCount(count || 0));
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
  }, [activeTenantId]);

  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [navigate]);

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
      <header className="top-navbar" style={{ position: 'relative', overflow: 'hidden' }}>
        {tenantConfig.logoUrl && (
          <>
            <img src={tenantConfig.logoUrl} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(40px)', opacity: 0.5, transform: 'scale(1.5)', zIndex: 0 }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to right, rgba(10,15,30,0.95) 0%, rgba(10,15,30,0.4) 100%)', zIndex: 1 }} />
          </>
        )}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: '100%', cursor: 'pointer' }} onClick={() => navigate('/')}>
          {tenantConfig.logoUrl ? (
            <div style={{ 
               height: '72px', 
               width: '35vw', 
               maxWidth: '500px',
               position: 'relative', 
               display: 'flex', 
               alignItems: 'center', 
               marginLeft: '-24px', 
               overflow: 'hidden'
            }}>
              {/* Fundo dinâmico borrado para estender o gradiente da logo sem distorcer o texto */}
              <img src={tenantConfig.logoUrl} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'right center', filter: 'blur(20px)', transform: 'scale(1.3)', zIndex: 0 }} />
              
              {/* Degradê para mesclar suavemente o final da logo com a cor da navbar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to right, transparent 50%, rgba(26, 29, 39, 0.95) 100%)', zIndex: 1 }} />
              
              {/* Logo nítida preservada à esquerda */}
              <img src={tenantConfig.logoUrl} alt="Logo Empresa" style={{ position: 'relative', zIndex: 2, height: '48px', width: '100%', objectFit: 'contain', objectPosition: 'left center', paddingLeft: '24px' }} />
            </div>
          ) : (
            <>
              <div style={{ marginRight: '16px', color: 'var(--accent-cyan)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <div style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0, lineHeight: 1, letterSpacing: '0.5px' }}>Smartcard</h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Gestão Ágil de Elevadores NI</span>
              </div>
            </>
          )}
          </div>
          
          <button 
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{ background: 'none', border: 'none', color: 'white', padding: '8px', cursor: 'pointer' }}
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        <div className={`nav-container ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <nav className="nav-center" style={{ marginLeft: 0 }}>
          <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} end>
              Dashboard
            </NavLink>
            {profile?.is_super_admin && (
              <NavLink to="/tenants" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                Empresas Clientes
              </NavLink>
            )}
            {profile?.can_register_users && (
              <>
                <NavLink to="/users" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                  Usuários
                </NavLink>
                <NavLink to="/companies" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                  Filiais
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

          </nav>

        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate('/tickets')}>
            <div style={{ 
              background: openMessagesCount > 0 ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255,255,255,0.05)', 
              color: openMessagesCount > 0 ? 'var(--accent-cyan)' : 'var(--text-secondary)', 
              padding: '8px', 
              borderRadius: '50%',
              border: openMessagesCount > 0 ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid var(--border-color)',
              transition: 'all 0.3s'
            }}>
              <MessageSquare size={18} />
            </div>
            {openMessagesCount > 0 && (
              <span style={{ 
                position: 'absolute', top: '-4px', right: '4px', 
                background: 'var(--accent-cyan)', color: '#000', 
                fontSize: '0.65rem', fontWeight: 'bold', 
                width: '16px', height: '16px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                borderRadius: '50%' 
              }}>{openMessagesCount}</span>
            )}
          </div>

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

          {profile?.is_super_admin && !loadingTenants && tenants.length > 0 && (
            <select
              value={activeTenantId || ''}
              onChange={(e) => setActiveTenantId(e.target.value || null)}
              className="select-field"
              style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto', minWidth: '150px' }}
            >
              <option value="">Todas as Empresas (Visão Global)</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}

          <div className="profile-info">
            <span className="profile-name">{profile?.full_name || 'Carregando...'}</span>
            <span className="profile-role">
              👑 {profile ? roleNames[profile.role] : ''}
            </span>
          </div>

          <button onClick={handleLogout} className="btn" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '8px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--accent-red)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px'
          }}>
            <LogOut size={16} />
            <span className="hide-on-mobile">Sair</span>
          </button>
        </div>
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
