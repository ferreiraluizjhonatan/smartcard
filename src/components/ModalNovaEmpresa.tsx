import React, { useState } from 'react';
import { X, Building, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ModalNovaEmpresaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  empresaToEdit?: any;
}

export function ModalNovaEmpresa({ isOpen, onClose, onSuccess, empresaToEdit }: ModalNovaEmpresaProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    responsavel: '',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    estado: '',
    observacoes: '',
    company_id: ''
  });
  
  const [filiais, setFiliais] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchFiliais = async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      if (data) setFiliais(data);
    };
    fetchFiliais();
  }, []);
  
  React.useEffect(() => {
    if (empresaToEdit && isOpen) {
      setFormData({
        razao_social: empresaToEdit.razao_social || '',
        nome_fantasia: empresaToEdit.nome_fantasia || '',
        cnpj: empresaToEdit.cnpj || '',
        responsavel: empresaToEdit.responsavel || '',
        telefone: empresaToEdit.telefone || '',
        email: empresaToEdit.email || '',
        endereco: empresaToEdit.endereco || '',
        cidade: empresaToEdit.cidade || '',
        estado: empresaToEdit.estado || '',
        observacoes: empresaToEdit.observacoes || '',
        company_id: empresaToEdit.company_id || ''
      });
    } else if (isOpen) {
      setFormData({
        razao_social: '',
        nome_fantasia: '',
        cnpj: '',
        responsavel: '',
        telefone: '',
        email: '',
        endereco: '',
        cidade: '',
        estado: '',
        observacoes: '',
        company_id: ''
      });
    }
  }, [empresaToEdit, isOpen]);
  
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (empresaToEdit) {
        const { error: submitError } = await supabase
          .from('empresas_contratadas')
          .update({
            ...formData
          })
          .eq('id', empresaToEdit.id);

        if (submitError) throw submitError;
      } else {
        const { error: submitError } = await supabase
          .from('empresas_contratadas')
          .insert([{
            ...formData,
            status: 'Ativa'
          }]);

        if (submitError) throw submitError;
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar empresa.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        margin: '16px', overflow: 'hidden', padding: 0
      }}>
        
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '20px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '10px', backgroundColor: 'rgba(0, 210, 255, 0.1)', borderRadius: '12px' }}>
              <Building color="var(--accent-cyan)" size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{empresaToEdit ? 'Editar Empresa' : 'Nova Empresa'}</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {empresaToEdit ? 'Atualizar dados da Terceirizada' : 'Cadastro de Terceirizada'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px'
          }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <form id="empresa-form" onSubmit={handleSubmit}>
            
            {error && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--accent-red)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Razão Social *</label>
                <input required name="razao_social" value={formData.razao_social} onChange={handleChange} className="input-field" placeholder="Razão Social LTDA" />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Nome Fantasia *</label>
                <input required name="nome_fantasia" value={formData.nome_fantasia} onChange={handleChange} className="input-field" placeholder="Nome Fantasia" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>CNPJ *</label>
                <input required name="cnpj" value={formData.cnpj} onChange={handleChange} className="input-field" placeholder="00.000.000/0000-00" />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Filial Vinculada</label>
                <select name="company_id" value={formData.company_id} onChange={handleChange as any} className="input-field" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                  <option value="">Selecione a Filial...</option>
                  {filiais.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Responsável *</label>
                <input required name="responsavel" value={formData.responsavel} onChange={handleChange} className="input-field" placeholder="Nome do Responsável" />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Telefone *</label>
                <input required name="telefone" value={formData.telefone} onChange={handleChange} className="input-field" placeholder="(00) 00000-0000" />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '16px' }}>
              <label>E-mail *</label>
              <input required type="email" name="email" value={formData.email} onChange={handleChange} className="input-field" placeholder="contato@empresa.com" />
            </div>

            <div style={{ margin: '24px 0', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
              <h4 style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--text-secondary)' }}>Endereço (Opcional)</h4>
              
              <div className="input-group" style={{ marginBottom: '16px' }}>
                <label>Endereço Completo</label>
                <input name="endereco" value={formData.endereco} onChange={handleChange} className="input-field" placeholder="Rua, Número, Bairro" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Cidade</label>
                  <input name="cidade" value={formData.cidade} onChange={handleChange} className="input-field" placeholder="Cidade" />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Estado</label>
                  <input name="estado" value={formData.estado} onChange={handleChange} className="input-field" placeholder="UF" />
                </div>
              </div>
            </div>

            <div className="input-group">
              <label>Observações (Opcional)</label>
              <textarea name="observacoes" value={formData.observacoes} onChange={handleChange} rows={3} className="input-field" placeholder="Anotações adicionais..." />
            </div>

          </form>
        </div>

        <div style={{
          padding: '20px 24px', borderTop: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)',
          display: 'flex', justifyContent: 'flex-end', gap: '12px'
        }}>
          <button onClick={onClose} disabled={loading} className="btn btn-secondary">
            Cancelar
          </button>
          <button form="empresa-form" type="submit" disabled={loading} className="btn btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {empresaToEdit ? 'Salvar Alterações' : 'Salvar Empresa'}
          </button>
        </div>

      </div>
    </div>
  );
}
