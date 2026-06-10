import React, { useEffect, useState } from 'react';
import { X, Clock, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ModalHistoricoImportacoesProps {
  onClose: () => void;
}

interface ImportHistory {
  id: string;
  created_at: string;
  arquivo: string;
  empresas_importadas: number;
  tecnicos_importados: number;
  registros_atualizados: number;
  erros: number;
  status: string;
}

export function ModalHistoricoImportacoes({ onClose }: ModalHistoricoImportacoesProps) {
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('importacoes_empresas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (!error && data) {
      setHistory(data);
    }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} color="var(--accent-primary)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Histórico de Importações</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Últimas planilhas processadas pelo sistema</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Carregando histórico...</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Nenhuma importação realizada ainda.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {history.map(item => (
                <div key={item.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileSpreadsheet size={16} color="var(--text-secondary)" />
                      <span style={{ color: '#fff', fontWeight: '500' }}>{item.arquivo}</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formatDate(item.created_at)}</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 'bold' }}>{item.empresas_importadas}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Empresas</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 'bold' }}>{item.tecnicos_importados}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Técnicos</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 'bold' }}>{item.registros_atualizados}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Atualizados</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', color: item.erros > 0 ? 'var(--accent-red)' : '#fff', fontWeight: 'bold' }}>{item.erros}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Erros</div>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: item.status === 'Concluído' ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                    {item.status === 'Concluído' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {item.status === 'Concluído' ? 'Importação finalizada sem falhas graves.' : 'Importação concluída com erros em algumas linhas.'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
