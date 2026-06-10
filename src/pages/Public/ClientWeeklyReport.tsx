import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Activity, Calendar, Flag, Clock, BrainCircuit, CalendarDays, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ClientWeeklyReport() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchReportData();
    }
  }, [id]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('get-client-report-data', {
        body: { elevator_id: id }
      });
      if (error || (result && result.error)) throw error || new Error(result.error);
      setData(result);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar o relatório de progresso.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ 
      minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', 
      background: '#0a1128', color: '#fff' 
    }}>Carregando relatório...</div>;
  }

  if (!data) {
    return <div style={{ 
      minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', 
      background: '#0a1128', color: '#fff' 
    }}>Nenhum dado encontrado para este elevador.</div>;
  }

  const { elevator, totalChecklists, completedChecklists, currentRealized, weeklyData, daysPassed } = data;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '12px', borderRadius: '8px' }}>
          <p style={{ color: '#fff', margin: '0 0 8px 0', fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, margin: '4px 0' }}>
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const currentExpected = weeklyData.length > 0 ? weeklyData[weeklyData.length - 1].esperado : 0;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a1128', 
      color: '#fff', 
      fontFamily: "'Inter', sans-serif",
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ 
            width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            marginBottom: '16px'
          }}>
            <Activity size={32} color="var(--accent-cyan)" />
          </div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: '800' }}>
            {elevator.project_name || elevator.name}
          </h1>
          <p style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>Relatório Restrito de Progresso (V2)</p>
        </div>

        {/* Gerar Cronograma Inteligente */}
        <button style={{
          width: '100%', padding: '14px', borderRadius: '8px', 
          background: 'linear-gradient(90deg, var(--accent-cyan), #0ea5e9)',
          border: 'none', color: '#fff', fontWeight: 'bold', fontSize: '1rem',
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
        }}>
          <CalendarDays size={20} />
          Gerar Cronograma Inteligente
        </button>

        {/* Aviso Cliente */}
        {elevator.supervisor_notes && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 'bold' }}>Aviso ao Cliente</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5', color: '#fcd34d' }}>{elevator.supervisor_notes}</p>
            </div>
          </div>
        )}

        {/* Cards de Avanço e Fases */}
        <div style={{ 
          display: 'flex', background: '#111827', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
          padding: '24px', justifyContent: 'space-around', alignItems: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '3rem', color: 'var(--accent-cyan)', fontWeight: '800' }}>{currentRealized}%</h2>
            <p style={{ margin: '8px 0 0 0', color: '#9ca3af', fontSize: '0.9rem' }}>Avanço Total</p>
          </div>
          <div style={{ width: '1px', height: '60px', background: 'rgba(255,255,255,0.1)' }}></div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '2.5rem', color: '#fff', fontWeight: '800' }}>
              {completedChecklists}<span style={{ fontSize: '1.2rem', color: '#9ca3af' }}>/{totalChecklists}</span>
            </h2>
            <p style={{ margin: '8px 0 0 0', color: '#9ca3af', fontSize: '0.9rem' }}>Fases Concluídas</p>
          </div>
        </div>

        {/* Dados do Prazo */}
        <div style={{ 
          background: '#111827', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
          padding: '24px', borderLeft: '4px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af' }}>
              <Calendar size={16} /> Data de Início:
            </span>
            <span style={{ fontWeight: 'bold' }}>
              {new Date(elevator.start_date || elevator.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af' }}>
              <Flag size={16} /> Prazo Contratual:
            </span>
            <span style={{ fontWeight: 'bold' }}>
              {elevator.expected_end_date ? new Date(elevator.expected_end_date).toLocaleDateString('pt-BR') : 'Não definido'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af' }}>
              <Clock size={16} /> Dias Corridos:
            </span>
            <span style={{ fontWeight: 'bold' }}>{daysPassed} dias</span>
          </div>

          {/* Barras de Progresso */}
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: '#9ca3af' }}>Avanço Esperado: <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{currentExpected}%</span></span>
            <span style={{ color: '#9ca3af' }}>Avanço Realizado: <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{currentRealized}%</span></span>
          </div>
          <div style={{ width: '100%', height: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
             <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${currentExpected}%`, background: '#f59e0b', opacity: 0.3 }}></div>
             <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${currentRealized}%`, background: 'var(--accent-cyan)' }}></div>
          </div>
          
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>
            <BrainCircuit size={16} /> Previsão Estimada (IA): 
            <span style={{ fontWeight: 'bold', marginLeft: 'auto' }}>
               {elevator.expected_end_date ? new Date(elevator.expected_end_date).toLocaleDateString('pt-BR') : 'A calcular'} 
               <span style={{ color: '#10b981', fontWeight: 'normal' }}> (~0 dias adicionais)</span>
            </span>
          </div>
        </div>

        {/* Gráfico */}
        <div style={{ 
          background: '#111827', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
          padding: '24px 16px', height: '300px'
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRealizado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="dateStr" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="realizado" name="Avanço Realizado" stroke="var(--accent-cyan)" strokeWidth={3} fillOpacity={1} fill="url(#colorRealizado)" />
              <Area type="monotone" dataKey="esperado" name="Avanço Esperado Linear" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" fill="none" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', fontSize: '0.85rem', color: '#9ca3af' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-cyan)' }}></div>
              Avanço Realizado (%)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '2px', background: '#f59e0b', border: '1px dashed #f59e0b' }}></div>
              Avanço Esperado Linear (%)
            </div>
          </div>
        </div>

        {/* Comparativo de Avanço Semanal */}
        <div style={{ marginTop: '8px' }}>
           <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', marginBottom: '16px' }}>
             <CalendarDays size={20} color="var(--accent-cyan)" />
             Comparativo de Avanço Semanal (Realizado vs Esperado)
           </h3>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
             {weeklyData.map((week: any, idx: number) => {
               const onTrack = week.realizado >= week.esperado;
               return (
                 <div key={idx} style={{ 
                   background: '#111827', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
                   padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'
                 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                     <div style={{ 
                       width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.1)', 
                       color: 'var(--accent-cyan)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold'
                     }}>
                       S{idx + 1}
                     </div>
                     <div>
                       <div style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
                         {week.week}
                       </div>
                       <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                         Semana de {week.dateStr}
                       </div>
                     </div>
                   </div>

                   <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                     <div style={{ textAlign: 'center' }}>
                       <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{week.realizado}%</div>
                       <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Realizado</div>
                     </div>
                     <div style={{ textAlign: 'center' }}>
                       <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f59e0b' }}>{week.esperado}%</div>
                       <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Esperado</div>
                     </div>
                     <div style={{ 
                       padding: '4px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 'bold',
                       background: onTrack ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                       color: onTrack ? '#10b981' : '#ef4444',
                       border: `1px solid ${onTrack ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                     }}>
                       {onTrack ? 'No Prazo' : 'Atrasado'}
                     </div>
                   </div>
                 </div>
               );
             })}
           </div>
        </div>

      </div>
    </div>
  );
}
