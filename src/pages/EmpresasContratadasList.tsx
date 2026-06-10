import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Plus, Search, Filter, Users, UploadCloud } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ModalNovaEmpresa } from '../components/ModalNovaEmpresa';
import { ModalImportacaoEmpresas } from '../components/ModalImportacaoEmpresas';

export function EmpresasContratadasList() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [filialFilter, setFilialFilter] = useState('Todas');
  const [filiais, setFiliais] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalImportOpen, setIsModalImportOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [canRegisterUsers, setCanRegisterUsers] = useState(false);
  const navigate = useNavigate();

  const fetchFiliais = async () => {
    const { data } = await supabase.from('companies').select('id, name, branch').order('name');
    if (data) setFiliais(data);
  };

  const fetchEmpresas = async () => {
    setLoading(true);
    
    const { data: empresasData, error } = await supabase
      .from('empresas_contratadas')
      .select('*, tecnicos_empresas(count), companies(name, branch)')
      .order('created_at', { ascending: false });

    if (!error && empresasData) {
      setEmpresas(empresasData);
    }
    setLoading(false);
  };

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('user_profiles').select('role, can_register_users').eq('id', user.id).single();
      if (data) {
        setUserRole(data.role);
        setCanRegisterUsers(data.can_register_users);
      }
    }
  };

  useEffect(() => {
    fetchFiliais();
    fetchEmpresas();
    fetchUserRole();
  }, []);

  const allowedRoles = ['Coordenador Nacional', 'Gerente Regional', 'Coordenador de Filial', 'Admin', 'admin', 'Master', 'master', 'Administrador'];
  const canImport = allowedRoles.includes(userRole || '') || canRegisterUsers;

  const filteredEmpresas = empresas.filter(emp => {
    const matchesSearch = emp.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.cnpj.includes(searchTerm);
    const matchesStatus = statusFilter === 'Todas' || emp.status === statusFilter;
    const matchesFilial = filialFilter === 'Todas' || emp.company_id === filialFilter;
    return matchesSearch && matchesStatus && matchesFilial;
  });

  return (
    <div style={{ padding: '24px', animation: 'slideUp 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '2rem', margin: '0 0 8px 0', background: 'linear-gradient(90deg, #fff, var(--accent-cyan))', WebkitBackgroundClip: 'text', color: 'transparent' }}>Empresas Contratadas</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Gestão de terceirizadas e prestadores de serviço</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {canImport && (
            <button onClick={() => setIsModalImportOpen(true)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UploadCloud size={18} /> Importar Planilha
            </button>
          )}
          <button onClick={() => setIsModalOpen(true)} className="btn-glow" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Nova Empresa
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '40px' }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Filter size={20} color="var(--text-secondary)" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select-field"
            style={{ width: '180px' }}
          >
            <option value="Todas">Todos os Status</option>
            <option value="Ativa">Ativa</option>
            <option value="Inativa">Inativa</option>
          </select>

          <select
            value={filialFilter}
            onChange={(e) => setFilialFilter(e.target.value)}
            className="select-field"
            style={{ width: '180px' }}
          >
            <option value="Todas">Todas as Filiais</option>
            {filiais.map(f => (
              <option key={f.id} value={f.id}>
                {f.name} {f.branch ? `- ${f.branch}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>Carregando empresas...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filteredEmpresas.map(empresa => (
            <div 
              key={empresa.id} 
              onClick={() => navigate(`/empresas-contratadas/${empresa.id}`)}
              className="neon-card border-cyan"
              style={{ cursor: 'pointer', transition: 'transform 0.2s', padding: '24px' }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ padding: '12px', backgroundColor: 'rgba(0, 210, 255, 0.1)', borderRadius: '12px' }}>
                  <Building size={28} color="var(--accent-cyan)" />
                </div>
                <span className={empresa.status === 'Ativa' ? 'badge badge-green' : 'badge badge-red'}>
                  {empresa.status}
                </span>
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {empresa.nome_fantasia}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 8px 0' }}>{empresa.cnpj}</p>
                {empresa.companies?.name && (
                  <span style={{ fontSize: '0.8rem', padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                    Filial: {empresa.companies.name} {empresa.companies.branch ? `- ${empresa.companies.branch}` : ''}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <Users size={16} />
                  <span>{empresa.tecnicos_empresas[0]?.count || 0} Técnicos</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
                  {new Date(empresa.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
          {filteredEmpresas.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
              Nenhuma empresa encontrada.
            </div>
          )}
        </div>
      )}

      <ModalNovaEmpresa 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchEmpresas} 
      />

      <ModalImportacaoEmpresas
        isOpen={isModalImportOpen}
        onClose={() => setIsModalImportOpen(false)}
        onSuccess={fetchEmpresas}
      />
    </div>
  );
}
