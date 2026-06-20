import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Wrench, ArrowRight, CheckCircle2, Clock, MapPin, Building2 } from 'lucide-react';

export default function MechanicPortal() {
  const { telegramId } = useParams();
  const navigate = useNavigate();
  const [mechanicName, setMechanicName] = useState<string>('');
  const [elevators, setElevators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [telegramId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!telegramId) return;

      const { data, error } = await supabase.functions.invoke('get-mechanic-data', {
        body: { telegramId }
      });

      if (error) throw error;

      if (data) {
        setMechanicName(data.mechanicName || '');
        setElevators(data.elevators || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-cyan)' }}>Carregando seu painel...</div>;

  if (!mechanicName) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--accent-red)' }}>Mecânico não encontrado</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Verifique se o seu ID do Telegram está cadastrado corretamente no sistema.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <div className="neon-card border-cyan" style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
          <Wrench size={24} />
        </div>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', color: '#fff' }}>Painel do Mecânico</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Bem-vindo, <strong style={{ color: 'var(--accent-cyan)' }}>{mechanicName}</strong></p>
        </div>
      </div>

      <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
        <Clock size={20} color="var(--accent-cyan)" /> Suas Obras em Montagem ({elevators.length})
      </h3>

      {elevators.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <CheckCircle2 size={48} color="var(--accent-cyan)" style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
          <p>Você não possui nenhuma obra pendente em fase de montagem no momento.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {elevators.map(elev => (
            <div 
              key={elev.id}
              className="glass-panel"
              style={{ 
                padding: '20px', 
                borderLeft: '4px solid var(--accent-cyan)',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onClick={() => navigate(`/tracking/${elev.id}?role=mechanic`)}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#fff' }}>{elev.name}</h4>
                  <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14}/> {elev.project_name || 'Obra'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Building2 size={14}/> {elev.customer_company || 'Cliente'}</span>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                  Acessar Fotos/Ocorrências <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
