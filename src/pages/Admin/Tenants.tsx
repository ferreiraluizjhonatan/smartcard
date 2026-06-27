import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Shield, Mail } from 'lucide-react';

export default function Tenants() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    status: 'active',
    telegram_bot_token: '',
    whatsapp_api_key: ''
  });

  const [inviteData, setInviteData] = useState({
    email: '',
    tenant_id: ''
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setTenants(data || []);
    } catch (err: any) {
      console.error('Error fetching tenants:', err);
      alert('Erro ao buscar clientes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tenant?: any) => {
    if (tenant) {
      setSelectedTenant(tenant);
      setFormData({
        name: tenant.name || '',
        status: tenant.status || 'active',
        telegram_bot_token: tenant.telegram_bot_token || '',
        whatsapp_api_key: tenant.whatsapp_api_key || ''
      });
    } else {
      setSelectedTenant(null);
      setFormData({ name: '', status: 'active', telegram_bot_token: '', whatsapp_api_key: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedTenant) {
        const { error } = await supabase.from('tenants').update(formData).eq('id', selectedTenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tenants').insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchTenants();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-tenant-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: inviteData.email,
          tenant_id: inviteData.tenant_id
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro desconhecido');

      alert(`Convite enviado com sucesso para ${inviteData.email}!`);
      setIsInviteModalOpen(false);
      setInviteData({ email: '', tenant_id: '' });
    } catch (err: any) {
      alert('Erro ao convidar: ' + err.message);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Carregando...</div>;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={24} color="var(--accent-cyan)" />
            Gestão de Empresas (SaaS)
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Cadastre e gerencie as empresas que utilizam o sistema.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setIsInviteModalOpen(true)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={16} /> Enviar Convite
          </button>
          <button onClick={() => handleOpenModal()} className="btn-glow" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Nova Empresa
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Nome da Empresa</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Robô Telegram</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Data Cadastro</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '16px', fontWeight: 'bold' }}>{t.name}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                    background: t.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: t.status === 'active' ? 'var(--accent-green)' : 'var(--accent-red)'
                  }}>
                    {t.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                  {t.telegram_bot_token ? 'Configurado ✓' : 'Não configurado'}
                </td>
                <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <button onClick={() => handleOpenModal(t)} className="btn-secondary" style={{ padding: '6px' }}>
                    <Edit2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Nenhuma empresa cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nova Empresa */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-dark)' }}>
            <h2 style={{ margin: '0 0 24px 0' }}>{selectedTenant ? 'Editar Empresa' : 'Nova Empresa'}</h2>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Nome da Empresa</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="form-input" placeholder="Ex: TKELEVATOR BR" />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="form-input">
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Telegram Bot Token (Opcional)</label>
                <input value={formData.telegram_bot_token} onChange={e => setFormData({...formData, telegram_bot_token: e.target.value})} className="form-input" placeholder="Token do @BotFather" />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Webhook URL: <span style={{ color: 'var(--accent-cyan)' }}>https://vtsnchqddkavtmyndntu.supabase.co/functions/v1/chatbot-webhook?tenant_id={selectedTenant?.id || 'ID_DA_EMPRESA'}</span></p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-glow">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Convidar */}
      {isInviteModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-dark)' }}>
            <h2 style={{ margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={20} /> Convidar Administrador</h2>
            
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Empresa (Tenant)</label>
                <select required value={inviteData.tenant_id} onChange={e => setInviteData({...inviteData, tenant_id: e.target.value})} className="form-input">
                  <option value="">Selecione uma empresa...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>E-mail do Administrador</label>
                <input required type="email" value={inviteData.email} onChange={e => setInviteData({...inviteData, email: e.target.value})} className="form-input" placeholder="admin@empresa.com.br" />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsInviteModalOpen(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-glow">Enviar Convite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
