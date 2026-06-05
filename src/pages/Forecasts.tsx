import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle2, ChevronRight, Activity, Calendar } from 'lucide-react';

export default function Forecasts() {
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecasts();
  }, []);

  const fetchForecasts = async () => {
    setLoading(true);
    // Fetch elevators joined with suas previsoes_entrega
    const { data, error } = await supabase
      .from('previsoes_entrega')
      .select(`
        *,
        elevators (
          id,
          name,
          project_name,
          customer_company,
          status,
          expected_end_date,
          team_name,
          supervisor_name
        )
      `)
      .order('probabilidade', { ascending: false });

    if (data) {
      setForecasts(data);
    }
    setLoading(false);
  };

  // Group by month for chart
  const getChartData = () => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentMonthIdx = new Date().getMonth();
    const targetMonths = [
      currentMonthIdx,
      (currentMonthIdx + 1) % 12,
      (currentMonthIdx + 2) % 12
    ];

    const chartData = targetMonths.map(m => ({
      name: months[m],
      mesIdx: m + 1,
      total: 0
    }));

    // Count scheduled deliveries for each month
    forecasts.forEach(f => {
      if (f.mes_previsto) {
        const idx = chartData.findIndex(c => c.mesIdx === f.mes_previsto);
        if (idx !== -1) {
          chartData[idx].total += 1;
        }
      }
    });

    return chartData;
  };

  const chartData = getChartData();
  const obrasEmRisco = forecasts.filter(f => f.risco_atraso);
  
  const avgConfidence = forecasts.length > 0 
    ? Math.round(forecasts.reduce((acc, f) => acc + Number(f.probabilidade), 0) / forecasts.length)
    : 0;

  const getBadgeColor = (classificacao: string) => {
    if (classificacao === 'Muito Alta' || classificacao === 'Alta') return 'var(--accent-green)';
    if (classificacao === 'Média') return 'var(--accent-yellow)';
    if (classificacao === 'Baixa') return 'var(--accent-orange)';
    return 'var(--accent-red)';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          color: '#fff',
          zIndex: 1000
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--accent-cyan)' }}>{label}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Previsão:</span>
            <strong style={{ fontSize: '1.2rem', color: '#fff' }}>{payload[0].value} Obras</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TrendingUp size={32} color="var(--accent-cyan)" /> Previsões de Entrega
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Visão analítica de entregas para os próximos 3 meses</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="neon-card border-cyan" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--accent-cyan)" /> Confiança Média Global
          </h3>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--accent-cyan)', lineHeight: '1' }}>{avgConfidence}%</div>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0', fontSize: '0.9rem' }}>Probabilidade média de entregas no prazo</p>
        </div>

        <div className="neon-card border-red" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="var(--accent-red)" /> Obras em Risco Crítico
          </h3>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--accent-red)', lineHeight: '1' }}>{obrasEmRisco.length}</div>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0', fontSize: '0.9rem' }}>Entregas que exigem atenção imediata</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} /> Entregas Estimadas
          </h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Bar dataKey="total" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--accent-green)' : index === 1 ? 'var(--accent-cyan)' : 'var(--accent-purple)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} /> Alertas Inteligentes
          </h3>
          {obrasEmRisco.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)', flexDirection: 'column', gap: '8px' }}>
               <CheckCircle2 size={32} />
               <span>Nenhuma obra em risco iminente</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }}>
              {obrasEmRisco.map(risco => (
                <div key={risco.id} style={{ padding: '16px', background: 'rgba(248, 113, 113, 0.05)', borderLeft: '4px solid var(--accent-red)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ color: 'white' }}>{risco.elevators?.name}</strong>
                    <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>{risco.probabilidade}%</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <strong>Fase:</strong> <span style={{ textTransform: 'uppercase' }}>{risco.elevators?.status.replace('_', ' ')}</span> | <strong>Técnico:</strong> {risco.elevators?.team_name || 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent-orange)' }}>
                    Motivo: {risco.motivo_risco}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 24px 0' }}>Lista de Obras Previstas</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Obra</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Cliente</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Fase Atual</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Data Prevista</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Probabilidade</th>
              </tr>
            </thead>
            <tbody>
              {forecasts.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px 12px', color: '#fff', fontWeight: 'bold' }}>{f.elevators?.name}</td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{f.elevators?.customer_company || '-'}</td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{f.elevators?.status.replace('_', ' ')}</td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>
                    {f.elevators?.expected_end_date ? new Date(f.elevators.expected_end_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'}
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold',
                        background: `${getBadgeColor(f.classificacao).replace('var(', '').replace(')', '')}20`,
                        color: getBadgeColor(f.classificacao)
                      }}>
                        {f.probabilidade}%
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{f.classificacao}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
