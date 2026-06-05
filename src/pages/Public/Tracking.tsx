import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, Circle, Clock, Building, MapPin, Calendar } from 'lucide-react';

export default function Tracking() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        // We use the new edge function to fetch data securely
        const { data: result, error } = await supabase.functions.invoke('get-tracking-data', {
          body: { elevator_id: id }
        });

        if (error) throw error;
        if (result.error) throw new Error(result.error);
        
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados da obra.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
        <div className="neon-card border-cyan">Carregando dados da obra...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
        <div className="neon-card border-red" style={{ color: 'var(--accent-red)' }}>{error || 'Obra não encontrada'}</div>
      </div>
    );
  }

  const { elevator, checklists } = data;
  
  // Calculate overall percentage
  const totalItems = checklists?.length || 1;
  const completedItems = checklists?.filter((c: any) => c.percentage === 100).length || 0;
  const overall = Math.round((completedItems / totalItems) * 100);

  const requestVisit = () => {
    alert('Solicitação de visita técnica enviada com sucesso! A equipe entrará em contato em breve.');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', padding: '24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ color: 'var(--accent-cyan)', fontSize: '2.5rem', marginBottom: '8px' }}>Evolução da Obra</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Acompanhe o progresso da pré-instalação do seu equipamento</p>
        </div>

        <div className="neon-card border-cyan" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={24} color="var(--accent-cyan)" /> 
                {elevator.project_name || elevator.name}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} /> Equipamento: {elevator.equipment_id || 'N/A'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} /> Cadastrado em: {new Date(elevator.created_at).toLocaleDateString()}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} /> Status Atual: <strong style={{ color: 'var(--accent-yellow)', textTransform: 'uppercase' }}>{elevator.status.replace('_', ' ')}</strong>
                </span>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: '250px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '24px', borderRadius: '12px' }}>
              <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Progresso Geral</span>
              <span style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--accent-cyan)', lineHeight: 1 }}>{overall}%</span>
              
              <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', overflow: 'hidden', marginTop: '16px' }}>
                <div style={{ width: `${overall}%`, background: 'var(--accent-cyan)', height: '100%', transition: 'width 1s ease' }}></div>
              </div>
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '16px', color: '#fff' }}>Itens de Verificação ({completedItems}/{totalItems})</h3>
        
        <div style={{ display: 'grid', gap: '12px', marginBottom: '40px' }}>
          {checklists?.map((item: any, index: number) => {
            const isDone = item.percentage === 100;
            return (
              <div key={item.id} className="glass-panel" style={{ 
                padding: '16px 20px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                borderLeft: isDone ? '4px solid var(--accent-green)' : '4px solid transparent'
              }}>
                {isDone ? (
                  <CheckCircle2 size={24} color="var(--accent-green)" />
                ) : (
                  <Circle size={24} color="var(--text-secondary)" />
                )}
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: isDone ? '#fff' : 'var(--text-secondary)' }}>
                    {index + 1}. {item.item_name}
                  </h4>
                </div>
                <div>
                  {isDone ? (
                    <span className="badge badge-green">Concluído</span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>Pendente</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', padding: '24px' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Precisa de apoio técnico ou quer agendar uma vistoria presencial para validação do poço?
          </p>
          <button onClick={requestVisit} className="btn-glow border-cyan" style={{ padding: '16px 32px', fontSize: '1.2rem' }}>
            Pedir Visita Técnica
          </button>
        </div>

      </div>
    </div>
  );
}
