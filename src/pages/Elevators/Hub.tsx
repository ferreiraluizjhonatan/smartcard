import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Activity, FileText, Calendar, Clock, AlertTriangle, Link as LinkIcon, Bot } from 'lucide-react';
import { AIChatModal } from '../../components/AIChatModal';

export default function ElevatorHub() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [elevator, setElevator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, percentage: 0 });
  const [openTickets, setOpenTickets] = useState(0);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const { data: el } = await supabase.from('elevators').select('*').eq('id', id).single();
    if (el) {
      setElevator(el);
      
      let tableName = 'pre_installation_checklists';
      if(el.status === 'montagem') tableName = 'assembly_checklists';
      if(el.status === 'ajuste') tableName = 'adjustment_checklists';

      const { data: chk } = await supabase.from(tableName).select('percentage').eq('elevator_id', id);
      if (chk) {
         const sum = chk.reduce((acc: any, curr: any) => acc + curr.percentage, 0);
         const completed = chk.filter((c: any) => c.percentage === 100).length;
         setStats({
            total: chk.length,
            completed: completed,
            percentage: chk.length > 0 ? Math.round(sum / chk.length) : 0
         });
      }

      const { count } = await supabase.from('tickets').select('id', { count: 'exact' })
         .eq('elevator_id', id)
         .eq('status', 'aberto');
      setOpenTickets(count || 0);
    }
    setLoading(false);
  };

  const calcExpected = () => {
    if(!elevator?.start_date || !elevator?.expected_end_date) return 0;
    const now = new Date();
    const start = new Date(elevator.start_date);
    const end = new Date(elevator.expected_end_date);
    if(now < start) return 0;
    if(now > end) return 100;
    return Math.round(((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100);
  };

  const getDaysInfo = () => {
    if(!elevator?.start_date || !elevator?.expected_end_date) return { decorridos: 0, restantes: 0 };
    const now = new Date();
    const start = new Date(elevator.start_date);
    const end = new Date(elevator.expected_end_date);
    const diffTimeNow = Math.max(0, now.getTime() - start.getTime());
    const decorridos = Math.floor(diffTimeNow / (1000 * 60 * 60 * 24));
    const diffTimeEnd = end.getTime() - now.getTime();
    const restantes = Math.max(0, Math.ceil(diffTimeEnd / (1000 * 60 * 60 * 24)));
    return { decorridos, restantes };
  };

  const expected = calcExpected();
  const { decorridos, restantes } = getDaysInfo();

  if(loading) return <div style={{ padding: '24px' }}>Carregando Hub...</div>;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/elevators')} style={{ padding: '8px', marginBottom: '16px' }}>
          <ArrowLeft size={20} /> Voltar
        </button>

        {/* Top Header Panel */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '2rem', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {elevator?.name} {elevator?.project_name ? `- ${elevator?.project_name}` : ''}
              <span className={`badge badge-cyan`} style={{ fontSize: '0.9rem', verticalAlign: 'middle' }}>{elevator?.status.replace('_', ' ')}</span>
            </h2>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <p style={{ margin: 0 }}>Empresa Contratada: <strong style={{color:'white'}}>{elevator?.customer_company || 'Não informada'}</strong> | Endereço: <strong style={{color:'white'}}>{elevator?.address || 'Não informado'}</strong></p>
              <p style={{ margin: 0 }}>Modelo: <strong style={{color:'white'}}>{elevator?.model || 'Não informado'}</strong> | ID do Eq.: <strong style={{color:'white'}}>{elevator?.equipment_id || 'Não informado'}</strong></p>
              <p style={{ margin: 0 }}>Paradas: <strong style={{color:'white'}}>{elevator?.stops || '-'}</strong> | Vel.: <strong style={{color:'white'}}>{elevator?.speed || '-'}</strong> | Cap.: <strong style={{color:'white'}}>{elevator?.passenger_capacity || '-'}</strong></p>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
            
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
              <button 
                className="btn-glow border-cyan" 
                onClick={() => {
                  const url = `${window.location.origin}/tracking/${id}`;
                  navigator.clipboard.writeText(url);
                  alert('Link Público (Visualização de Fotos/Anotações) copiado para a área de transferência!');
                }}
                style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', height: 'fit-content', whiteSpace: 'nowrap' }}
              >
                <LinkIcon size={16}/> Copiar Link Tracking
              </button>
              
              <button 
                className="btn-glow border-purple" 
                onClick={() => {
                  const url = `${window.location.origin}/client-report/${id}`;
                  navigator.clipboard.writeText(url);
                  alert('Relatório Restrito de Progresso (V2) copiado! Envie este link para o cliente acompanhar os gráficos e histórico.');
                }}
                style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', height: 'fit-content', whiteSpace: 'nowrap', background: 'rgba(168, 85, 247, 0.1)' }}
              >
                <Activity size={16}/> Copiar Relatório Cliente
              </button>

              <div className="input-group" style={{ marginBottom: 0, minWidth: '250px', flex: 1 }}>
                 <label style={{ fontSize: '0.85rem', color: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                   <AlertTriangle size={14} /> Aviso Cliente (Atrasos/Paralisações)
                 </label>
                 <input 
                    type="text"
                    className="input-field" 
                    value={elevator?.supervisor_notes || ''} 
                    placeholder="Escreva um motivo de atraso..."
                    onChange={async (e) => {
                      const val = e.target.value;
                      setElevator({...elevator, supervisor_notes: val});
                      await supabase.from('elevators').update({ supervisor_notes: val }).eq('id', id);
                    }}
                    style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '100%' }} 
                 />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(0, 255, 255, 0.05)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(0, 255, 255, 0.2)', textAlign: 'center', minWidth: '110px' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-cyan)', lineHeight: 1, marginBottom: '4px' }}>{stats.percentage}%</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '1px' }}>Realizado</div>
              </div>
              <div style={{ background: 'rgba(255, 170, 0, 0.05)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255, 170, 0, 0.2)', textAlign: 'center', minWidth: '110px' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-yellow)', lineHeight: 1, marginBottom: '4px' }}>{expected}%</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-yellow)', textTransform: 'uppercase', letterSpacing: '1px' }}>Esperado</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center', minWidth: '110px' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white', lineHeight: 1, marginBottom: '4px' }}>{decorridos}d</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Decorridos</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Options */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        <div className="neon-card border-cyan" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => navigate(`/elevators/${id}/checklist`)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Activity size={24} color="var(--accent-cyan)"/> Fases da Obra
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Pré-Instalação (Conclusão)</label>
              <input 
                type="date" 
                value={elevator?.pre_install_end_date || ''} 
                onChange={async (e) => {
                  const val = e.target.value;
                  setElevator({...elevator, pre_install_end_date: val});
                  await supabase.from('elevators').update({ pre_install_end_date: val }).eq('id', id);
                }}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.85rem' }} 
              />
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', marginTop: 'auto' }}>Concluídas:</p>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', lineHeight: 1 }}>
            {stats.completed} <span style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>/ {stats.total}</span>
          </div>
        </div>

        <div className="neon-card border-purple" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => navigate(`/elevators/${id}/schedule`)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar size={24} color="var(--accent-purple)"/> Cronograma (Gantt)
            </h3>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Data de Início</label>
              <input 
                type="date" 
                value={elevator?.start_date || ''} 
                onChange={async (e) => {
                  const val = e.target.value;
                  setElevator({...elevator, start_date: val});
                  await supabase.from('elevators').update({ start_date: val }).eq('id', id);
                }}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.85rem' }} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Prazo Final</label>
              <input 
                type="date" 
                value={elevator?.expected_end_date || ''} 
                onChange={async (e) => {
                  const val = e.target.value;
                  setElevator({...elevator, expected_end_date: val});
                  await supabase.from('elevators').update({ expected_end_date: val }).eq('id', id);
                }}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.85rem' }} 
              />
            </div>
          </div>

          <div style={{ fontSize: '1.1rem', color: 'var(--accent-purple)', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
             Ver Planejamento Temporal <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
          </div>
        </div>

        <div className="neon-card border-green" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => navigate(`/elevators/${id}/report`)}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={24} color="var(--accent-green)"/> Relatório Técnico
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Emitir relatórios PDF/Fotos:</p>
          <div style={{ fontSize: '1.2rem', color: 'var(--accent-green)', marginTop: '24px' }}>
             Gerar Documento PDF
          </div>
        </div>

        <div className="neon-card border-yellow" style={{ cursor: 'pointer' }}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Clock size={24} color="var(--accent-yellow)"/> Histórico & Logs
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Mudanças de fase:</p>
          <div style={{ fontSize: '1.2rem', color: 'var(--accent-yellow)', marginTop: '24px' }}>
             Ver logs do banco de dados
          </div>
        </div>

        <div className="neon-card border-red" style={{ cursor: 'pointer' }} onClick={() => navigate(`/tickets?elevator_id=${id}`)}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={24} color="var(--accent-red)"/> Ocorrências
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Pendências não resolvidas:</p>
          <div style={{ fontSize: '1.2rem', color: 'var(--accent-red)', marginTop: '24px' }}>
             {openTickets} alerta{openTickets !== 1 ? 's' : ''} pendente{openTickets !== 1 ? 's' : ''}
          </div>
        </div>

      </div>

      {/* Botão Flutuante de Apoio da IA */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 90 }}>
         <button 
           onClick={() => setIsAIModalOpen(true)}
           className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-cyan text-white px-6 py-4 rounded-full font-bold shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:scale-105 transition-transform"
         >
           <Bot size={24} />
           Apoio da IA
         </button>
      </div>

      <AIChatModal 
        isOpen={isAIModalOpen} 
        onClose={() => setIsAIModalOpen(false)}
        elevatorId={id}
        contextData={{
           view: 'ElevatorHub',
           elevator_name: elevator?.name,
           elevator_status: elevator?.status,
           mechanic: elevator?.mechanic_name,
           progress_percentage: stats.percentage,
           expected_percentage: expected,
           days_elapsed: decorridos,
           open_tickets: openTickets
        }}
      />
    </div>
  );
}
