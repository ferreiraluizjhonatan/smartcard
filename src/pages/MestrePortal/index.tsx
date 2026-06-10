import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Camera, CheckCircle2, AlertCircle, ArrowLeft, Clock, Upload, Send, MessageSquare } from 'lucide-react';

export default function MestrePortal() {
  const { contract } = useParams<{ contract: string }>();
  const navigate = useNavigate();
  const [elevators, setElevators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedElevator, setSelectedElevator] = useState<any | null>(null);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [sendingMsg, setSendingMsg] = useState(false);

  // Default civil phases
  const civilPhases = [
    { id: 'iluminacao', name: 'Iluminação do Poço (Provisória/Definitiva)' },
    { id: 'prumo', name: 'Esquadro e Prumo' },
    { id: 'impermeabilizacao', name: 'Impermeabilização do Poço' },
    { id: 'andaime', name: 'Andaime Instalado' },
    { id: 'limpeza', name: 'Limpeza do Poço' },
    { id: 'energia', name: 'Energia Trifásica (Caixa de Força)' },
  ];

  useEffect(() => {
    if (contract) {
      fetchElevators();
    }
  }, [contract]);

  const fetchElevators = async () => {
    setLoading(true);
    // Find elevators belonging to this contract
    const { data, error } = await supabase
      .from('elevators')
      .select('*')
      .eq('contract_number', contract)
      .order('name');
      
    if (data && data.length > 0) {
      setElevators(data);
    } else {
      setElevators([]);
    }
    setLoading(false);
  };

  const fetchProgress = async (elevatorId: string) => {
    const { data } = await supabase
      .from('mestre_progress')
      .select('*')
      .eq('elevator_id', elevatorId);
    if (data) {
      setProgressData(data);
    }
    
    const { data: ticketsData } = await supabase
      .from('tickets')
      .select('*, ticket_comments(*)')
      .eq('elevator_id', elevatorId)
      .eq('title', 'Mensagem do Mestre (Link Público)')
      .order('created_at', { ascending: false });
    
    if (ticketsData) setTicketHistory(ticketsData);
  };

  const requestVisit = async () => {
    if (!message.trim() || !selectedElevator) {
       alert("Por favor, digite sua mensagem ou solicitação.");
       return;
    }
    setSendingMsg(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('client-portal-action', {
        body: { 
          action: 'send_message', 
          payload: { 
            elevator_id: selectedElevator.id, 
            message: message, 
            company_id: selectedElevator.company_id 
          }
        }
      });
      if (error || (result && result.error)) throw error || new Error(result.error);
      alert('Mensagem enviada com sucesso! A equipe SmartCard entrará em contato em breve.');
      setMessage('');
      fetchProgress(selectedElevator.id);
    } catch(err) {
      console.error(err);
      alert('Erro ao enviar mensagem.');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleSelectElevator = (el: any) => {
    setSelectedElevator(el);
    fetchProgress(el.id);
  };

  const getPhaseProgress = (phaseId: string) => {
    return progressData.find(p => p.phase_name === phaseId) || { percentage: 0, notes: '', status: 'in_progress', photo_urls: [] };
  };

  const saveProgress = async (phaseId: string, percentage: number, notes: string) => {
    const existing = progressData.find(p => p.phase_name === phaseId);
    if (existing) {
      const { data } = await supabase.from('mestre_progress').update({ percentage, notes, updated_at: new Date() }).eq('id', existing.id).select();
      if(data) setProgressData(prev => prev.map(p => p.id === existing.id ? data[0] : p));
    } else {
      const { data } = await supabase.from('mestre_progress').insert({
        elevator_id: selectedElevator.id,
        phase_name: phaseId,
        percentage,
        notes
      }).select();
      if(data) setProgressData(prev => [...prev, data[0]]);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, phaseId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Simplification for prototype: In real world, upload to Supabase Storage first
    alert('Upload de foto: Em um ambiente real, a foto seria salva no Supabase Storage e o link anexado à fase.');
    
    // Dummy update for visual feedback
    const existing = progressData.find(p => p.phase_name === phaseId);
    if (existing) {
      const newUrls = [...(existing.photo_urls || []), 'dummy_url.jpg'];
      const { data } = await supabase.from('mestre_progress').update({ photo_urls: newUrls, updated_at: new Date() }).eq('id', existing.id).select();
      if(data) setProgressData(prev => prev.map(p => p.id === existing.id ? data[0] : p));
    } else {
      const { data } = await supabase.from('mestre_progress').insert({
        elevator_id: selectedElevator.id,
        phase_name: phaseId,
        photo_urls: ['dummy_url.jpg']
      }).select();
      if(data) setProgressData(prev => [...prev, data[0]]);
    }
  };

  const handleChamarVistoria = async (phaseId: string) => {
    const existing = progressData.find(p => p.phase_name === phaseId);
    if (existing && existing.percentage === 100) {
      if (!existing.photo_urls || existing.photo_urls.length === 0) {
        alert('Por favor, anexe pelo menos uma foto como evidência para solicitar a vistoria!');
        return;
      }
      await supabase.from('mestre_progress').update({ status: 'ready_for_inspection' }).eq('id', existing.id);
      fetchProgress(selectedElevator.id);
      alert('Vistoria solicitada! Nossa equipe de Pré-Instalação será notificada.');
    } else {
      alert('A fase precisa estar 100% concluída para chamar a vistoria.');
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#fff', textAlign: 'center' }}>Buscando obras do contrato...</div>;
  }

  if (elevators.length === 0) {
    return (
      <div style={{ padding: '24px', color: '#fff', textAlign: 'center' }}>
        <h2>Link Inválido</h2>
        <p>Não encontramos nenhum elevador associado a este contrato ({contract}).</p>
      </div>
    );
  }

  if (!selectedElevator) {
    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', color: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ color: 'var(--accent-cyan)', margin: '0 0 8px 0' }}>Portal da Obra</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Contrato: {contract}</p>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{elevators[0].customer_company}</p>
        </div>

        <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Selecione o Elevador:</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {elevators.map(el => (
            <div 
              key={el.id} 
              className="neon-card border-cyan" 
              style={{ padding: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => handleSelectElevator(el)}
            >
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '4px' }}>{el.name || el.equipment_id || 'Elevador'}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{el.project_name || el.address}</div>
              </div>
              <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '8px', borderRadius: '50%' }}>
                <ArrowLeft size={20} color="var(--accent-cyan)" style={{ transform: 'rotate(180deg)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', color: '#fff', paddingBottom: '80px' }}>
      <button 
        className="btn btn-secondary" 
        onClick={() => setSelectedElevator(null)}
        style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <ArrowLeft size={16} /> Voltar para lista
      </button>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--accent-yellow)', margin: '0 0 4px 0' }}>{selectedElevator.name || selectedElevator.equipment_id}</h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Fases Civis (Pré-Instalação)</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {civilPhases.map(phase => {
          const prog = getPhaseProgress(phase.id);
          const isDone = prog.percentage === 100;
          const isPendingInspection = prog.status === 'ready_for_inspection';

          return (
            <div key={phase.id} className="neon-card" style={{ padding: '20px', borderLeft: isDone ? '4px solid var(--accent-green)' : '4px solid var(--accent-yellow)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{phase.name}</div>
                {isPendingInspection ? (
                  <span style={{ fontSize: '0.8rem', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)', padding: '4px 8px', borderRadius: '12px' }}>Aguardando Visita</span>
                ) : isDone ? (
                  <CheckCircle2 color="var(--accent-green)" size={20} />
                ) : (
                  <Clock color="var(--accent-yellow)" size={20} />
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <span>Progresso da Fase</span>
                  <span>{prog.percentage}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" step="10" 
                  value={prog.percentage}
                  onChange={(e) => saveProgress(phase.id, parseInt(e.target.value), prog.notes)}
                  style={{ width: '100%', accentColor: isDone ? 'var(--accent-green)' : 'var(--accent-yellow)' }}
                  disabled={isPendingInspection}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <textarea 
                  className="input-field"
                  placeholder="Minhas anotações e pendências (Opcional)..."
                  value={prog.notes || ''}
                  onChange={(e) => saveProgress(phase.id, prog.percentage, e.target.value)}
                  style={{ minHeight: '60px', resize: 'vertical' }}
                  disabled={isPendingInspection}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <label className="btn btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', opacity: isPendingInspection ? 0.5 : 1 }}>
                  <Camera size={16} /> {(prog.photo_urls && prog.photo_urls.length > 0) ? `${prog.photo_urls.length} Foto(s)` : 'Tirar Foto'}
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handlePhotoUpload(e, phase.id)} disabled={isPendingInspection} />
                </label>
                
                {isDone && !isPendingInspection && (
                  <button 
                    className="btn-glow border-green" 
                    style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                    onClick={() => handleChamarVistoria(phase.id)}
                  >
                    <Send size={16} /> Chamar Visita
                  </button>
                )}
              </div>

            </div>
          );
        })}

        {/* Contact Team Section */}
        <div className="neon-card border-cyan" style={{ padding: '24px', marginTop: '16px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={20} color="var(--accent-cyan)"/> Enviar Mensagem ou Solicitação
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
            Precisa de apoio técnico, quer agendar uma vistoria presencial ou relatar um problema na obra? Envie uma mensagem direta para nossa equipe técnica.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
             <textarea
               value={message}
               onChange={(e) => setMessage(e.target.value)}
               className="input-field"
               rows={4}
               placeholder="Digite sua solicitação aqui... ex: A obra está liberada para instalação do poço amanhã."
               style={{ resize: 'vertical' }}
             />
             <button 
               onClick={requestVisit} 
               disabled={sendingMsg}
               className="btn-glow border-cyan" 
               style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: sendingMsg ? 0.5 : 1 }}
             >
               <Send size={18} />
               {sendingMsg ? 'Enviando Mensagem...' : 'Enviar Mensagem'}
             </button>
          </div>

          {/* Ticket History */}
          {ticketHistory.length > 0 && (
            <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
              <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Histórico de Comunicação</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {ticketHistory.map(ticket => (
                  <div key={ticket.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>Sua Mensagem</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(ticket.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>{ticket.description}</p>
                    
                    {ticket.ticket_comments && ticket.ticket_comments.length > 0 && (
                      <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {ticket.ticket_comments.map((comment: any) => (
                          <div key={comment.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '6px', marginLeft: '16px', borderLeft: '2px solid var(--accent-green)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--accent-green)' }}>Resposta da Equipe</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(comment.created_at).toLocaleString('pt-BR')}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>{comment.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {(!ticket.ticket_comments || ticket.ticket_comments.length === 0) && (
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Aguardando resposta da equipe...</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
