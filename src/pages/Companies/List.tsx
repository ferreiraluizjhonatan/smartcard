import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react';

export default function CompaniesList() {
  const [companies, setCompanies] = useState<any[]>([]);
  const navigate = useNavigate();

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('*, user_profiles:supervisor_id(full_name)').order('name');
    if (data) setCompanies(data);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta empresa?")) return;
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) alert("Erro: " + error.message);
    else fetchCompanies();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Empresas Parceiras</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Gerenciamento de empresas terceirizadas</p>
        </div>
        <button className="btn-glow" onClick={() => navigate('/companies/new')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Nova Empresa
        </button>
      </div>

      <div className="neon-card border-cyan" style={{ padding: '0', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
              <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Nome da Empresa</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Região</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Filial</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Supervisor Responsável</th>
              <th style={{ padding: '16px', textAlign: 'right', color: 'var(--text-secondary)' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(company => (
              <tr key={company.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'rgba(34, 211, 238, 0.1)', padding: '8px', borderRadius: '8px' }}>
                      <Building2 size={20} color="var(--accent-cyan)" />
                    </div>
                    <span style={{ fontWeight: 500 }}>{company.name}</span>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>{company.region || '-'}</td>
                <td style={{ padding: '16px' }}>{company.branch || '-'}</td>
                <td style={{ padding: '16px' }}>{company.user_profiles?.full_name || '-'}</td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={() => navigate(`/companies/${company.id}/edit`)} style={{ padding: '6px' }} title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button className="btn btn-secondary" onClick={() => handleDelete(company.id)} style={{ padding: '6px', color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.3)' }} title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Nenhuma empresa cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
