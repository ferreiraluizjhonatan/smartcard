import React, { useState } from 'react';
import { X, UserPlus, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ModalNovoTecnicoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  empresaId: string;
  tecnicoToEdit?: any;
}

export function ModalNovoTecnico({ isOpen, onClose, onSuccess, empresaId, tecnicoToEdit }: ModalNovoTecnicoProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    matricula: '',
    cpf: '',
    telefone: '',
    email: '',
    telegram_id: '',
    funcao: 'Montador',
    status: 'Ativo'
  });
  
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (tecnicoToEdit && isOpen) {
      setFormData({
        nome: tecnicoToEdit.nome || '',
        matricula: tecnicoToEdit.matricula || '',
        cpf: tecnicoToEdit.cpf || '',
        telefone: tecnicoToEdit.telefone || '',
        email: tecnicoToEdit.email || '',
        telegram_id: tecnicoToEdit.telegram_id || '',
        funcao: tecnicoToEdit.funcao || 'Montador',
        status: tecnicoToEdit.status || 'Ativo'
      });
    } else {
      setFormData({
        nome: '',
        matricula: '',
        cpf: '',
        telefone: '',
        email: '',
        telegram_id: '',
        funcao: 'Montador',
        status: 'Ativo'
      });
    }
  }, [tecnicoToEdit, isOpen]);

  if (!isOpen) return null;

  const funcoes = [
    'Pré-Instalador',
    'Montador',
    'Ajustador',
    'Supervisor',
    'Técnico Especialista'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (tecnicoToEdit) {
        const { error: submitError } = await supabase
          .from('tecnicos_empresas')
          .update(formData)
          .eq('id', tecnicoToEdit.id);
        if (submitError) throw submitError;
      } else {
        const { error: submitError } = await supabase
          .from('tecnicos_empresas')
          .insert([{
            ...formData,
            empresa_id: empresaId
          }]);
        if (submitError) throw submitError;
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar técnico.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
              <UserPlus color="var(--accent-cyan)" size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{tecnicoToEdit ? 'Editar Técnico' : 'Novo Técnico'}</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {tecnicoToEdit ? 'Atualizar dados do profissional' : 'Vincular profissional à terceirizada'}
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
          <form id="tecnico-form" onSubmit={handleSubmit}>
            
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
                <label>Nome Completo *</label>
                <input required name="nome" value={formData.nome} onChange={handleChange} className="input-field" placeholder="Nome Completo" />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Matrícula *</label>
                <input required name="matricula" value={formData.matricula} onChange={handleChange} className="input-field" placeholder="Matrícula" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>CPF *</label>
                <input required name="cpf" value={formData.cpf} onChange={handleChange} className="input-field" placeholder="000.000.000-00" />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Telefone *</label>
                <input required name="telefone" value={formData.telefone} onChange={handleChange} className="input-field" placeholder="(00) 00000-0000" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>E-mail *</label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} className="input-field" placeholder="email@exemplo.com" />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Telegram ID (Opcional)</label>
                <input name="telegram_id" value={formData.telegram_id} onChange={handleChange} className="input-field" placeholder="@usuario" />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Função *</label>
                <select name="funcao" value={formData.funcao} onChange={handleChange} className="select-field">
                  {funcoes.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Status *</label>
                <select name="status" value={formData.status} onChange={handleChange} className="select-field">
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
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
          <button form="tecnico-form" type="submit" disabled={loading} className="btn btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            Salvar Técnico
          </button>
        </div>

      </div>
    </div>
  );
}
