import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { renderItemName } from '../Elevators/Checklist';
import { Printer, Calendar, CheckCircle2, Image as ImageIcon, MapPin, Building2, Clock, AlertCircle, Upload, Send, MessageSquare, ChevronDown, ChevronUp, BarChart2, FileText, Camera, AlertTriangle, History, Lock, Eye, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function ClientPortal() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [isMechanic, setIsMechanic] = useState(searchParams.get('role') === 'mechanic');
  const [elevator, setElevator] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [phaseTable, setPhaseTable] = useState<string>('pre_installation_checklists');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [mechanicNotes, setMechanicNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [generalPendingItems, setGeneralPendingItems] = useState<any[]>([]);
  const [newItemPending, setNewItemPending] = useState<Record<string, string>>({});
  const [addingPending, setAddingPending] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    'pre_installation_checklists': true,
    'assembly_checklists': true,
    'adjustment_checklists': true
  });

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => ({ ...prev, [phase]: !prev[phase] }));
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('get-tracking-data', {
        body: { elevator_id: id }
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);
      
      setElevator(result.elevator);
      setMechanicNotes(result.elevator?.mechanic_notes || '');
      setItems(result.checklists || []);
      if (result.phase_table) {
        setPhaseTable(result.phase_table);
      }
      
      // Fetch ticket history for this elevator
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select('*, ticket_comments(*)')
        .eq('elevator_id', id)
        .order('created_at', { ascending: false });
        
      if (ticketsData) {
        setTicketHistory(ticketsData.filter(t => t.title === 'Mensagem do Mestre (Link Público)'));
        setGeneralPendingItems(ticketsData);
      }
    } catch (err: any) {
      console.error(err);
      // Fallback message if not found
    }
    setLoading(false);
  };

  const requestVisit = async () => {
    if (!message.trim()) {
       alert("Por favor, digite sua mensagem ou solicitação.");
       return;
    }
    setSendingMsg(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('client-portal-action', {
        body: { 
          action: 'send_message', 
          payload: { 
            elevator_id: id, 
            message: message, 
            company_id: elevator?.company_id 
          }
        }
      });
      if (error || (result && result.error)) throw error || new Error(result.error);
      alert('Mensagem enviada com sucesso! A equipe SmartCard entrará em contato em breve.');
      setMessage('');
      fetchData(); // Refresh history
    } catch(err) {
      console.error(err);
      alert('Erro ao enviar mensagem.');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleAddItemPending = async (item: any) => {
    const text = newItemPending[item.id];
    if (!text?.trim()) return;
    setAddingPending(true);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('client-portal-action', {
        body: {
          action: 'create_ticket',
          payload: {
            elevator_id: id,
            company_id: elevator?.company_id,
            title: item.item_name,
            message: text
          }
        }
      });
      if (fnError || (result && result.error)) throw fnError || new Error(result.error);
      setNewItemPending(prev => ({ ...prev, [item.id]: '' }));
      fetchData();
    } catch(err) {
      console.error(err);
      alert('Erro ao adicionar pendência. Tente novamente.');
    } finally {
      setAddingPending(false);
    }
  };

  const handleTogglePendingItem = async (p: any) => {
    const newStatus = p.status === 'aberto' ? 'fechado' : 'aberto';
    // Optimistic UI
    setGeneralPendingItems(prev => prev.map(t => t.id === p.id ? { ...t, status: newStatus } : t));
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('client-portal-action', {
        body: {
          action: 'toggle_ticket_status',
          payload: {
            ticket_id: p.id,
            new_status: newStatus
          }
        }
      });
      if (fnError || (result && result.error)) throw fnError || new Error(result.error);
    } catch(err) {
      console.error(err);
      // Revert Optimistic
      setGeneralPendingItems(prev => prev.map(t => t.id === p.id ? { ...t, status: p.status } : t));
      alert('Erro ao atualizar status da pendência.');
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>, itemId: string, itemTableName: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingItemId(itemId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}/${itemId}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-evidences')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('client-evidences')
        .getPublicUrl(filePath);

      const { data: result, error: fnError } = await supabase.functions.invoke('client-portal-action', {
        body: {
          action: 'save_photo',
          payload: {
            elevator_id: id,
            phase_table: itemTableName,
            item_id: itemId,
            photo_url: publicUrl
          }
        }
      });

      if (fnError || (result && result.error)) throw fnError || new Error(result.error);
      
      // Update local state to show the photo immediately
      setItems(items.map(it => {
        if (it.id === itemId) {
          return { ...it, photos_urls: [...(it.photos_urls || []), publicUrl] };
        }
        return it;
      }));

      alert('Foto anexada com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao anexar foto. Tente novamente.');
    } finally {
      setUploadingItemId(null);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  const handleUpdateProgress = async (itemId: string, tableName: string, newPercentage: number, notes?: string, pending_items?: string, reminders?: string) => {
    // Optimistic UI Update
    setItems(items.map(it => {
      if (it.id === itemId) {
        return { 
          ...it, 
          percentage: newPercentage, 
          notes: notes !== undefined ? notes : it.notes,
          pending_items: pending_items !== undefined ? pending_items : it.pending_items,
          reminders: reminders !== undefined ? reminders : it.reminders
        };
      }
      return it;
    }));

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('client-portal-action', {
        body: {
          action: 'update_progress',
          payload: {
            phase_table: tableName,
            item_id: itemId,
            percentage: newPercentage,
            notes,
            pending_items,
            reminders
          }
        }
      });

      if (fnError || (result && result.error)) throw fnError || new Error(result.error);
    } catch (err) {
      console.error("Failed to update progress", err);
      // Revert on error could be implemented here if needed
    }
  };

  const handleUpdateMechanicNotes = async () => {
    setSavingNotes(true);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('client-portal-action', {
        body: {
          action: 'save_mechanic_notes',
          payload: {
            elevator_id: id,
            mechanic_notes: mechanicNotes
          }
        }
      });
      if (fnError || (result && result.error)) throw fnError || new Error(result.error);
      alert('Anotações salvas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar anotações.');
    } finally {
      setSavingNotes(false);
    }
  };

  const getPercentageCompleted = () => {
    if (!items || !items.length) return 0;
    const completed = items.filter(i => i.percentage === 100).length;
    return Math.round((completed / items.length) * 100);
  };

  const getExpectedPercentage = () => {
    if (!elevator?.start_date || !elevator?.expected_end_date) return 0;
    const start = new Date(elevator.start_date).getTime();
    const end = new Date(elevator.expected_end_date).getTime();
    const today = new Date().getTime();
    
    if (today < start) return 0;
    if (today > end) return 100;
    
    return Math.round(((today - start) / (end - start)) * 100);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-cyan)' }}>Carregando dados da obra...</div>;
  if (!elevator) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>Obra não encontrada ou link inválido.</div>;

  const realPerc = getPercentageCompleted();
  const expectedPerc = getExpectedPercentage();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem' }}>Acompanhamento de Obra</h1>
          <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={16}/> {elevator.name}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Building2 size={16}/> {elevator.customer_company || 'Cliente'} - {elevator.project_name || 'Obra'}</span>
          </div>
        </div>
        <button 
          className="btn-glow border-cyan print-hide" 
          onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Printer size={18} /> Gerar Relatório PDF
        </button>
      </div>

      {/* Supervisor Notes Alert */}
      {elevator.supervisor_notes && (
        <div style={{ 
          background: 'rgba(255, 170, 0, 0.1)', 
          border: '1px solid var(--accent-yellow)', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '32px',
          display: 'flex',
          gap: '12px'
        }}>
          <AlertCircle size={24} color="var(--accent-yellow)" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: '0 0 4px 0', color: 'var(--accent-yellow)' }}>Aviso do Supervisor / Engenharia</h4>
            <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: '1.5' }}>{elevator.supervisor_notes}</p>
          </div>
        </div>
      )}

      {/* Progress Bars */}
      <div className="neon-card border-cyan" style={{ marginBottom: '32px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={20} color="var(--accent-cyan)"/> Evolução do Projeto
        </h3>
        
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
           <div style={{ flex: '1 1 200px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Realizado (Físico)</span>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', fontSize: '1.2rem' }}>{realPerc}%</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${realPerc}%`, background: 'var(--accent-cyan)' }}></div>
              </div>
           </div>

           <div style={{ flex: '1 1 200px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Esperado (Cronograma)</span>
                <span style={{ color: 'var(--accent-yellow)', fontWeight: 'bold', fontSize: '1.2rem' }}>{expectedPerc}%</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${expectedPerc}%`, background: 'var(--accent-yellow)' }}></div>
              </div>
           </div>
        </div>
      </div>

      {/* Gantt / Checklist with Accordion */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} color="var(--accent-purple)"/> Cronograma Completo e Fases Executivas
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { key: 'pre_installation_checklists', title: 'Pré-Instalação' },
            { key: 'assembly_checklists', title: 'Montagem' },
            { key: 'adjustment_checklists', title: 'Ajustes' }
          ].map(phase => {
            const phaseItems = items.filter(i => i.table_name === phase.key);
            if (phaseItems.length === 0) return null;
            if (isMechanic && phase.key === 'pre_installation_checklists') return null;
            const isExpanded = expandedPhases[phase.key];
            const completedCount = phaseItems.filter(i => i.percentage === 100).length;

            return (
              <div key={phase.key} style={{ marginBottom: '8px' }}>
                <div 
                  onClick={() => togglePhase(phase.key)}
                  style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '16px', background: 'rgba(255,255,255,0.05)', 
                    borderRadius: '8px', cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                    {phase.title} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>({completedCount}/{phaseItems.length})</span>
                  </h4>
                  {isExpanded ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
                </div>

                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', paddingLeft: '8px' }}>
                    {phaseItems.map((item, index) => {
                      const isDone = item.percentage === 100;
                      const hasPhotos = item.photos_urls && item.photos_urls.length > 0;
                      
                      // Strip prefix for cleaner mobile look and also strip leading numbers
                      const cleanItemName = item.item_name.replace(/^\[.*?\]\s*/, '').replace(/^\d+\.\s*/, '');
                      
                      return (
                        <div key={item.id} style={{ 
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
                          padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px',
                          borderLeft: `4px solid ${isDone ? 'var(--accent-cyan)' : 'transparent'}`
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '250px' }}>
                            <div style={{ 
                              width: '32px', height: '32px', borderRadius: '50%', 
                              background: isDone ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: isDone ? '#000' : '#fff', flexShrink: 0
                            }}>
                              {isDone ? <CheckCircle2 size={18} /> : index + 1}
                            </div>
                            <div>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', wordBreak: 'break-word' }}>{renderItemName(cleanItemName)}</h4>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {item.planned_start_date ? new Date(item.planned_start_date).toLocaleDateString('pt-BR') : 'Sem data'} 
                                {' - '} 
                                {item.planned_end_date ? new Date(item.planned_end_date).toLocaleDateString('pt-BR') : 'Sem data'}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            {!isDone && <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Pendente</span>}
                            
                            {hasPhotos && (
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {item.photos_urls.map((url: string, pIdx: number) => (
                                  <a 
                                    key={pIdx} 
                                    href={url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="badge badge-purple print-hide" 
                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                    title="Visualizar Evidência"
                                  >
                                    <ImageIcon size={12} /> Foto {pIdx + 1}
                                  </a>
                                ))}
                              </div>
                            )}

                            <label className="badge badge-yellow print-hide" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: uploadingItemId === item.id ? 0.5 : 1 }}>
                               <Upload size={12} />
                               {uploadingItemId === item.id ? 'Enviando...' : 'Anexar'}
                               <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingItemId === item.id} onChange={(e) => handleUploadPhoto(e, item.id, item.table_name)} />
                            </label>
                          </div>
                          
                          {/* Mechanic Controls */}
                          {isMechanic && (
                            <div style={{ width: '100%', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginRight: '8px' }}>Progresso:</span>
                                {[0, 25, 50, 75, 100].map(pct => (
                                  <button
                                    key={pct}
                                    onClick={() => handleUpdateProgress(item.id, item.table_name, pct)}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '4px',
                                      border: `1px solid ${item.percentage === pct ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.2)'}`,
                                      background: item.percentage === pct ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                                      color: item.percentage === pct ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                                      cursor: 'pointer',
                                      fontWeight: item.percentage === pct ? 'bold' : 'normal',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    {pct}%
                                  </button>
                                ))}
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                <div className="input-group" style={{ margin: 0 }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>
                                    <MessageSquare size={14}/> Observações
                                  </label>
                                  <textarea
                                    value={item.notes || ''}
                                    onChange={(e) => setItems(items.map(it => it.id === item.id ? { ...it, notes: e.target.value } : it))}
                                    onBlur={(e) => handleUpdateProgress(item.id, item.table_name, item.percentage || 0, e.target.value, item.pending_items, item.reminders)}
                                    placeholder="Anotações técnicas..."
                                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '8px 12px', color: 'white', resize: 'vertical', minHeight: '60px', fontSize: '0.9rem' }}
                                  />
                                </div>

                                <div className="input-group" style={{ margin: 0 }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-red)', fontSize: '0.85rem', marginBottom: '4px' }}>
                                    <AlertTriangle size={14}/> Pendências Desta Etapa
                                  </label>
                                  
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', maxHeight: '150px', overflowY: 'auto' }}>
                                    {generalPendingItems.filter(p => p.title === item.item_name || p.title === `Problema: ${item.item_name}`).length === 0 && (
                                      <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem' }}>Nenhuma pendência anotada.</div>
                                    )}
                                    {generalPendingItems.filter(p => p.title === item.item_name || p.title === `Problema: ${item.item_name}`).map((p) => (
                                      <div key={p.id} style={{ 
                                        display: 'flex', alignItems: 'center', gap: '8px', 
                                        background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px',
                                        borderLeft: p.status === 'fechado' ? '3px solid var(--accent-green)' : '3px solid var(--accent-red)'
                                      }}>
                                        <button 
                                          onClick={() => handleTogglePendingItem(p)}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.status === 'fechado' ? 'var(--accent-green)' : 'var(--text-secondary)', padding: 0, display: 'flex', alignItems: 'center' }}>
                                          {p.status === 'fechado' ? <CheckCircle2 size={16} /> : <div style={{ width: '14px', height: '14px', border: '2px solid var(--text-secondary)', borderRadius: '50%' }} />}
                                        </button>
                                        <span style={{ 
                                          color: 'white', flex: 1, fontSize: '0.85rem',
                                          textDecoration: p.status === 'fechado' ? 'line-through' : 'none',
                                          opacity: p.status === 'fechado' ? 0.6 : 1
                                        }}>
                                          {p.description}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                      type="text" 
                                      className="input-field" 
                                      placeholder="Digite uma nova pendência..." 
                                      value={newItemPending[item.id] || ''}
                                      onChange={(e) => setNewItemPending(prev => ({ ...prev, [item.id]: e.target.value }))}
                                      onKeyDown={(e) => e.key === 'Enter' && handleAddItemPending(item)}
                                      style={{ flex: 1, fontSize: '0.85rem', padding: '6px 10px', margin: 0 }}
                                    />
                                    <button 
                                      className="btn-glow border-red" 
                                      onClick={() => handleAddItemPending(item)} 
                                      disabled={addingPending || !(newItemPending[item.id]?.trim())}
                                      style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '6px 10px' }}>
                                      <Plus size={14} /> Adicionar
                                    </button>
                                  </div>
                                </div>

                                <div className="input-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-yellow)', fontSize: '0.85rem', marginBottom: '4px' }}>
                                    <Clock size={14}/> Lembretes
                                  </label>
                                  <input
                                    type="text"
                                    value={item.reminders || ''}
                                    onChange={(e) => setItems(items.map(it => it.id === item.id ? { ...it, reminders: e.target.value } : it))}
                                    onBlur={(e) => handleUpdateProgress(item.id, item.table_name, item.percentage || 0, item.notes, item.pending_items, e.target.value)}
                                    placeholder="Ex: Trazer chave de torque na próxima visita..."
                                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '8px 12px', color: 'white', fontSize: '0.9rem' }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-panel print-hide" style={{ padding: '24px', marginTop: '24px' }}>
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
      
      {/* Summary of Notes (Mechanic Only) */}
      {isMechanic && (
        <div className="glass-panel print-hide" style={{ padding: '24px', marginTop: '24px', border: '1px solid var(--accent-cyan)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)' }}>
            <FileText size={20} /> Resumo de Anotações das Fases
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
            Lista de todas as observações, pendências e lembretes que você preencheu nos passos acima.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
            {items.filter(it => it.notes || it.pending_items || it.reminders).length === 0 ? (
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Nenhuma anotação registrada nos itens da obra.
              </div>
            ) : (
              items.filter(it => it.notes || it.pending_items || it.reminders).map(item => {
                const cleanItemName = item.item_name.replace(/^\[.*?\]\s*/, '').replace(/^\d+\.\s*/, '');
                return (
                  <div key={item.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid var(--accent-cyan)' }}>
                    <h5 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{renderItemName(cleanItemName)}</h5>
                    
                    {item.notes && (
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                        <MessageSquare size={14} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.notes}</span>
                      </div>
                    )}
                    
                    {item.pending_items && (
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                        <AlertTriangle size={14} color="var(--accent-red)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--accent-red)' }}>{item.pending_items}</span>
                      </div>
                    )}
                    
                    {item.reminders && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Clock size={14} color="var(--accent-yellow)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--accent-yellow)' }}>{item.reminders}</span>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Global Mechanic Notes Panel */}
      {isMechanic && (
        <div className="glass-panel print-hide" style={{ padding: '24px', marginTop: '24px', border: '1px solid var(--accent-purple)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-purple)' }}>
            <FileText size={20} /> Anotações Gerais da Obra
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
            Bloco de notas geral para o seu controle. O que você anotar aqui ficará salvo para você e o supervisor lerem.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
             <textarea
               value={mechanicNotes}
               onChange={(e) => setMechanicNotes(e.target.value)}
               className="input-field"
               rows={6}
               placeholder="Ex: Falta trazer a furadeira especial amanhã. Verificar alinhamento da guia 3..."
               style={{ resize: 'vertical', background: 'rgba(0,0,0,0.3)' }}
             />
             <button 
               onClick={handleUpdateMechanicNotes} 
               disabled={savingNotes}
               className="btn-glow border-purple" 
               style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: savingNotes ? 0.5 : 1 }}
             >
               {savingNotes ? 'Salvando...' : 'Salvar Anotações'}
             </button>
          </div>
        </div>
      )}

      {/* Footer Mechanic Toggle */}
      {!isMechanic && (
        <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '20px' }}>
          <button 
            onClick={() => setIsMechanic(true)}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            🛠️ Acesso Técnico
          </button>
        </div>
      )}
      
      {/* Ocorrências e Histórico de Ações (Relatório) */}
      <div className="glass-panel" style={{ padding: '24px', marginTop: '32px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-red)' }}>
          <AlertTriangle size={24} /> Ocorrências e Histórico de Ações
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {generalPendingItems.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>Nenhuma ocorrência registrada.</p>
          ) : (
            generalPendingItems.map(p => {
              const isClosed = p.status === 'fechado';
              const createdDate = new Date(p.created_at).toLocaleDateString('pt-BR');
              const closedDate = p.closed_at ? new Date(p.closed_at).toLocaleDateString('pt-BR') : null;
              
              return (
                <div key={p.id} style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  padding: '16px', 
                  borderRadius: '4px',
                  borderLeft: isClosed ? '4px solid var(--accent-green)' : '4px solid var(--accent-yellow)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{renderItemName(p.title || 'Pendência Geral')}</h4>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{p.description}</p>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <div style={{ marginBottom: '4px' }}>
                      {isClosed ? (
                         <span>{createdDate} - Status: FECHADO{closedDate && ` (${closedDate})`}</span>
                      ) : (
                         <span>{createdDate} - Status: ABERTO</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Print styles inserted directly to hide elements when generating PDF */}
      <style>
        {`
          @media print {
            body { background: white; color: black; }
            .print-hide { display: none !important; }
            .neon-card, .glass-panel { border: 1px solid #ccc !important; background: transparent !important; color: black !important; box-shadow: none !important; }
            span, p, h1, h2, h3, h4 { color: black !important; }
            .badge { border: 1px solid #ccc; color: black !important; }
          }
        `}
      </style>
    </div>
  );
}
