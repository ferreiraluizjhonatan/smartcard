import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building, MapPin, Phone, Mail, ArrowLeft, Users, UserPlus, FileEdit, Trash2, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ModalNovoTecnico } from '../components/ModalNovoTecnico';

export function EmpresaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<any>(null);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dados' | 'tecnicos'>('dados');
  const [isModalTecnicoOpen, setIsModalTecnicoOpen] = useState(false);
  const [tecnicoToEdit, setTecnicoToEdit] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    if (!id) return;

    const { data: empData } = await supabase
      .from('empresas_contratadas')
      .select('*')
      .eq('id', id)
      .single();

    if (empData) setEmpresa(empData);

    const { data: tecData } = await supabase
      .from('tecnicos_empresas')
      .select('*')
      .eq('empresa_id', id)
      .order('nome');

    if (tecData) setTecnicos(tecData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const toggleStatus = async (tecId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';
    const { error } = await supabase
      .from('tecnicos_empresas')
      .update({ status: newStatus })
      .eq('id', tecId);
    
    if (!error) {
      setTecnicos(prev => prev.map(t => t.id === tecId ? { ...t, status: newStatus } : t));
    } else {
      alert('Erro ao alterar status: ' + error.message);
    }
  };

  const deleteTecnico = async (tecId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este técnico? Esta ação não pode ser desfeita.')) return;
    
    const { error } = await supabase
      .from('tecnicos_empresas')
      .delete()
      .eq('id', tecId);
      
    if (!error) {
      setTecnicos(prev => prev.filter(t => t.id !== tecId));
    } else {
      alert('Erro ao excluir técnico: ' + error.message);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Carregando detalhes...</div>;
  if (!empresa) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--accent-red)' }}>Empresa não encontrada.</div>;

  return (
    <div style={{ padding: '24px', animation: 'slideUp 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
        <button onClick={() => navigate('/empresas-contratadas')} style={{ 
          background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-primary)',
          padding: '12px', borderRadius: '12px', cursor: 'pointer'
        }}>
          <ArrowLeft size={24} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h2 style={{ margin: 0, fontSize: '2rem' }}>{empresa.nome_fantasia}</h2>
            <span className={empresa.status === 'Ativa' ? 'badge badge-green' : 'badge badge-red'}>
              {empresa.status}
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>CNPJ: {empresa.cnpj}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--border-color)', marginBottom: '32px' }}>
        <button 
          onClick={() => setActiveTab('dados')}
          style={{ 
            background: 'none', border: 'none', padding: '0 0 12px 0', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
            borderBottom: activeTab === 'dados' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'dados' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
          }}
        >
          <Building size={18} /> Dados da Empresa
        </button>
        <button 
          onClick={() => setActiveTab('tecnicos')}
          style={{ 
            background: 'none', border: 'none', padding: '0 0 12px 0', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
            borderBottom: activeTab === 'tecnicos' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'tecnicos' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
          }}
        >
          <Users size={18} /> Técnicos Vinculados ({tecnicos.length})
        </button>
      </div>

      {/* Tab Content: Dados */}
      {activeTab === 'dados' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '32px' }}>
              <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Informações Cadastrais</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Razão Social</p>
                  <p style={{ margin: 0, fontWeight: 500 }}>{empresa.razao_social}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Responsável</p>
                  <p style={{ margin: 0, fontWeight: 500 }}>{empresa.responsavel}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Data de Cadastro</p>
                  <p style={{ margin: 0, fontWeight: 500 }}>{new Date(empresa.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '32px' }}>
              <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Endereço</h3>
              {empresa.endereco ? (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <MapPin color="var(--accent-cyan)" size={24} style={{ marginTop: '2px' }} />
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{empresa.endereco}</p>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{empresa.cidade}{empresa.estado ? ` - ${empresa.estado}` : ''}</p>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Endereço não informado.</p>
              )}
            </div>
          </div>

          <div>
            <div className="glass-panel" style={{ padding: '32px' }}>
              <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Contato</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                    <Phone size={20} color="var(--accent-cyan)" />
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Telefone Principal</p>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: '1.1rem' }}>{empresa.telefone}</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                    <Mail size={20} color="var(--accent-cyan)" />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>E-mail</p>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{empresa.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      )}

      {/* Tab Content: Técnicos */}
      {activeTab === 'tecnicos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
            <button onClick={() => { setTecnicoToEdit(null); setIsModalTecnicoOpen(true); }} className="btn-glow" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} /> Novo Técnico
            </button>
          </div>

          {tecnicos.length === 0 ? (
            <div className="glass-panel" style={{ padding: '80px 20px', textAlign: 'center', borderStyle: 'dashed' }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                <Users size={32} color="var(--text-secondary)" />
              </div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.5rem' }}>Nenhum técnico vinculado</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '400px', marginInline: 'auto' }}>
                Esta empresa ainda não possui técnicos cadastrados. Clique no botão acima para adicionar.
              </p>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '0', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '20px 24px', fontWeight: 600 }}>Técnico</th>
                    <th style={{ padding: '20px 24px', fontWeight: 600 }}>Função</th>
                    <th style={{ padding: '20px 24px', fontWeight: 600 }}>Contato</th>
                    <th style={{ padding: '20px 24px', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '20px 24px', fontWeight: 600, textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {tecnicos.map((tec, index) => (
                    <tr key={tec.id} style={{ borderBottom: index !== tecnicos.length - 1 ? '1px solid var(--border-color)' : 'none', transition: 'background 0.2s' }}>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>{tec.nome}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Matrícula: {tec.matricula}</div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <span style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.85rem' }}>
                          {tec.funcao}
                        </span>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ fontSize: '0.95rem', marginBottom: '4px' }}>{tec.telefone}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{tec.email}</div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600,
                          color: tec.status === 'Ativo' ? 'var(--accent-green)' : 'var(--accent-red)'
                        }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: tec.status === 'Ativo' ? 'var(--accent-green)' : 'var(--accent-red)' }}></div>
                          {tec.status}
                        </span>
                      </td>
                      <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button onClick={() => { setTecnicoToEdit(tec); setIsModalTecnicoOpen(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '8px' }} title="Editar">
                            <FileEdit size={18} />
                          </button>
                          <button onClick={() => toggleStatus(tec.id, tec.status)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '8px' }} title="Inativar/Ativar">
                            <ShieldAlert size={18} />
                          </button>
                          <button onClick={() => deleteTecnico(tec.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '8px' }} title="Excluir">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ModalNovoTecnico 
        isOpen={isModalTecnicoOpen}
        onClose={() => {
          setIsModalTecnicoOpen(false);
          setTecnicoToEdit(null);
        }}
        onSuccess={fetchData}
        empresaId={id as string}
        tecnicoToEdit={tecnicoToEdit}
      />
    </div>
  );
}
