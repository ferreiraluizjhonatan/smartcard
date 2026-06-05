import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';

export default function UsersForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [formData, setFormData] = useState({
    full_name: '', matricula: '', email: '', telefone: '', telegram_id: '',
    role: 'montador', region_id: '', branch_id: '', supervisor_id: '',
    is_active: true, data_admissao: '', password: '', can_register_users: false,
    branch_name: '', region_name: '', company_id: ''
  });

  const [loading, setLoading] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [companiesList, setCompaniesList] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('user_profiles').select('id, full_name, role, branch_name, region_name').order('full_name').then(({data}) => {
      if(data) setUsersList(data);
    });
    supabase.from('companies').select('id, name').order('name').then(({data}) => {
      if(data) setCompaniesList(data);
    });

    if (id) {
      supabase.from('user_profiles').select('*').eq('id', id).single().then(({data}) => {
        if(data) setFormData({
          full_name: data.full_name || '', matricula: data.matricula || '', email: data.email || '',
          telefone: data.telefone || '', telegram_id: data.telegram_id || '', role: data.role || 'montador',
          region_id: data.region_id || '', branch_id: data.branch_id || '', supervisor_id: data.supervisor_id || '',
          is_active: data.is_active, data_admissao: data.data_admissao || '',
          can_register_users: data.can_register_users || false,
          branch_name: data.branch_name || '',
          region_name: data.region_name || '',
          company_id: data.company_id || '',
          password: ''
        });
      });
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (id) {
      const { error } = await supabase.from('user_profiles').update({
        full_name: formData.full_name, matricula: formData.matricula, email: formData.email,
        telefone: formData.telefone, telegram_id: formData.telegram_id, role: formData.role,
        is_active: formData.is_active, data_admissao: formData.data_admissao || null,
        can_register_users: formData.can_register_users,
        supervisor_id: formData.supervisor_id || null,
        branch_name: formData.branch_name || null,
        region_name: formData.region_name || null,
        company_id: formData.company_id || null
      }).eq('id', id);

      if (error) alert(error.message);
      else {
        alert('Usuário atualizado com sucesso!');
        navigate('/users');
      }
    } else {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        alert("Erro: Sessão inválida.");
        setLoading(false);
        return;
      }
      
      const { data: profile } = await supabase.from('user_profiles').select('company_id').eq('id', authData.user.id).single();
      if (!profile) {
        alert("Erro: Permissão negada ou perfil não encontrado (Problema de RLS).");
        setLoading(false);
        return;
      }

      const isMechanic = ['montador', 'ajustador', 'pre_instalador'].includes(formData.role);
      const generatedPassword = isMechanic ? Math.random().toString(36).slice(-10) + 'A!1' : formData.password;

      const { error } = await supabase.rpc('create_user_account', {
        user_email: formData.email,
        user_password: generatedPassword,
        user_full_name: formData.full_name,
        user_company_id: profile.company_id,
        user_role: formData.role,
        user_matricula: formData.matricula,
        user_telefone: formData.telefone,
        user_telegram_id: formData.telegram_id,
        user_is_active: formData.is_active,
        user_data_admissao: formData.data_admissao || null,
        user_can_register: formData.can_register_users,
        user_supervisor_id: formData.supervisor_id || null,
        user_branch_name: formData.branch_name || null,
        user_region_name: formData.region_name || null
      });

      if (error) {
        alert(error.message);
      } else {
        alert('Usuário criado com sucesso!');
        navigate('/users');
      }
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '24px' }}>
        {id ? 'Editar Usuário' : 'Novo Cadastro de Técnico/Staff'}
      </h2>
      
      <div className="neon-card border-purple">
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          
          <div className="input-group">
            <label>Nome Completo *</label>
            <input required type="text" className="input-field" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
          </div>

          <div className="input-group">
            <label>Matrícula *</label>
            <input required type="text" className="input-field" value={formData.matricula} onChange={e => setFormData({...formData, matricula: e.target.value})} />
          </div>

          <div className="input-group">
            <label>E-mail *</label>
            <input required type="email" className="input-field" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          {!id && (
            <div className="input-group">
              <label>Senha Inicial do Usuário *</label>
              <input 
                required={!['montador', 'ajustador', 'pre_instalador'].includes(formData.role)}
                type="password" 
                minLength={6} 
                className="input-field" 
                placeholder={['montador', 'ajustador', 'pre_instalador'].includes(formData.role) ? 'Gerada automaticamente (Acesso bloqueado)' : '••••••••'} 
                value={['montador', 'ajustador', 'pre_instalador'].includes(formData.role) ? '' : formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                disabled={['montador', 'ajustador', 'pre_instalador'].includes(formData.role)}
                style={['montador', 'ajustador', 'pre_instalador'].includes(formData.role) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              />
            </div>
          )}

          <div className="input-group">
            <label>Telefone</label>
            <input type="tel" className="input-field" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} />
          </div>

          <div className="input-group">
            <label>Telegram ID</label>
            <input type="text" className="input-field" value={formData.telegram_id} onChange={e => setFormData({...formData, telegram_id: e.target.value})} />
          </div>

          <div className="input-group">
            <label>Empresa (Terceirizada)</label>
            <select className="select-field" value={formData.company_id} onChange={e => setFormData({...formData, company_id: e.target.value})}>
              <option value="">Interno (Sem empresa terceira)</option>
              {companiesList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Data de Admissão</label>
            <input type="date" className="input-field" value={formData.data_admissao} onChange={e => setFormData({...formData, data_admissao: e.target.value})} />
          </div>

          <div className="input-group">
            <label>Cargo Hierárquico</label>
            <select className="select-field" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
              <option value="coordenador_nacional">Coordenador Nacional</option>
              <option value="gerente_regional">Gerente Regional</option>
              <option value="coordenador_filial">Coordenador de Filial</option>
              <option value="gestor_equipe">Gestor de Equipe</option>
              <option value="supervisor">Supervisor</option>
              <option value="pre_instalador">Pré-Instalador</option>
              <option value="montador">Montador</option>
              <option value="ajustador">Ajustador</option>
            </select>
          </div>

          <div className="input-group">
            <label>Filial (Texto livre)</label>
            <input type="text" className="input-field" value={formData.branch_name} onChange={e => setFormData({...formData, branch_name: e.target.value})} placeholder="Ex: SP Capital, RJ Litoral..." />
          </div>

          <div className="input-group">
            <label>Regional (Texto livre)</label>
            <input type="text" className="input-field" value={formData.region_name} onChange={e => setFormData({...formData, region_name: e.target.value})} placeholder="Ex: Sudeste, Sul, Norte..." />
          </div>

          <div className="input-group">
            <label>Supervisor/Gestor Direto</label>
            <select className="select-field" value={formData.supervisor_id} onChange={e => {
              const supId = e.target.value;
              const supervisor = usersList.find(u => u.id === supId);
              setFormData(prev => ({
                ...prev, 
                supervisor_id: supId,
                branch_name: supervisor?.branch_name ? supervisor.branch_name : prev.branch_name,
                region_name: supervisor?.region_name ? supervisor.region_name : prev.region_name
              }));
            }}>
              <option value="">Nenhum (Topo de Hierarquia)</option>
              {usersList.filter(u => u.id !== id).map(u => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.role.replace('_', ' ')})</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Status Operacional</label>
            <select className="select-field" value={formData.is_active ? 'true' : 'false'} onChange={e => setFormData({...formData, is_active: e.target.value === 'true'})}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>

          <div className="input-group" style={{ gridColumn: '1 / -1', flexDirection: 'row', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            <input 
              type="checkbox" 
              id="canRegister"
              checked={formData.can_register_users} 
              onChange={e => setFormData({...formData, can_register_users: e.target.checked})} 
              style={{ width: '20px', height: '20px', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
            />
            <label htmlFor="canRegister" style={{ cursor: 'pointer', margin: 0, color: '#fff', fontSize: '1rem' }}>
              Permitir que este usuário acesse a Gestão de Usuários (Cadastrar e Excluir perfis)
            </label>
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/users')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{id ? 'Salvar Alterações' : 'Criar Usuário'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
