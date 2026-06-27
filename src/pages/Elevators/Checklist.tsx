import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, MessageSquare, AlertTriangle, Clock, Camera, Edit2, Award, Plus, Trash2 } from 'lucide-react';

export const renderItemName = (name: string) => {
  if (!name) return name;
  const parts = name.split(/(\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith('(') && part.endsWith(')')) {
      return <span key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal', marginLeft: '4px' }}>{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
};

export default function Checklist() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [elevator, setElevator] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);
  const [ticketModal, setTicketModal] = useState<any>(null);
  const [ticketDescription, setTicketDescription] = useState('');
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [generalPendingItems, setGeneralPendingItems] = useState<any[]>([]);
  const [newPendingItem, setNewPendingItem] = useState('');
  const [newItemPending, setNewItemPending] = useState<Record<string, string>>({});
  const [addingPending, setAddingPending] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const getTableName = (status: string) => {
    if (status === 'montagem') return 'assembly_checklists';
    if (status === 'ajuste') return 'adjustment_checklists';
    return 'pre_installation_checklists';
  };

  const fetchData = async () => {
    const { data: el } = await supabase.from('elevators').select('*').eq('id', id).single();
    if (el) {
      setElevator(el);
      const tableName = getTableName(el.status);
      const { data: chk } = await supabase.from(tableName).select('*').eq('elevator_id', id).order('id');
      if (chk) {
        chk.sort((a, b) => {
          const numA = parseInt(a.item_name.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.item_name.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });
        setItems(chk);
      }

      // Fetch all pending items/tickets for this elevator regardless of phase
      const { data: pendencias } = await supabase.from('tickets')
        .select('*')
        .eq('elevator_id', id)
        .order('created_at', { ascending: true });
      if (pendencias) {
        setGeneralPendingItems(pendencias);
      }
    }
    setLoading(false);
  };

  const updateItem = async (itemId: string, field: string, value: any) => {
    if (!elevator) return;
    
    // Optimistic UI update
    const updatedItems = items.map(i => i.id === itemId ? { ...i, [field]: value } : i);
    setItems(updatedItems);
    
    const tableName = getTableName(elevator.status);
    await supabase.from(tableName).update({ [field]: value }).eq('id', itemId);
    
    // Auto-fill pre_install_end_date if overall reached 100%
    if (elevator.status === 'pre_instalacao') {
       const sum = updatedItems.reduce((acc, curr) => acc + curr.percentage, 0);
       const newOverall = Math.round(sum / updatedItems.length);
       
       if (newOverall === 100 && !elevator.pre_install_end_date) {
           const today = new Date().toISOString().split('T')[0];
           await supabase.from('elevators').update({ pre_install_end_date: today }).eq('id', id);
           setElevator((prev: any) => ({ ...prev, pre_install_end_date: today }));
       }
    }

    // Check if it moved automatically (only applies to pre_instalacao and montagem)
    if (field === 'percentage' && value === 100 && elevator.status !== 'ajuste') {
      const { data: el } = await supabase.from('elevators').select('status').eq('id', id).single();
      if (el && el.status !== elevator.status) {
         // Auto-fill dates if moved to Montagem
         if (elevator.status === 'pre_instalacao' && el.status === 'montagem') {
             const today = new Date().toISOString().split('T')[0];
             await supabase.from('elevators').update({
                pre_install_end_date: today,
                assembly_start_date: today
             }).eq('id', id);
         }

         alert(`Fase concluída com sucesso! O Elevador foi movido para: ${el.status.toUpperCase()}.`);
         fetchData(); // reload to get the new table
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, item: any) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    const currentPhotos = item.photos_urls || [];
    
    if (files.length > 3) {
      alert("Você só pode enviar no máximo 3 fotos por vez.");
      e.target.value = '';
      return;
    }
    
    if (currentPhotos.length + files.length > 3) {
      alert(`Você já enviou ${currentPhotos.length} fotos. O limite é 3 por fase.`);
      e.target.value = '';
      return;
    }

    setUploadingItem(item.id);
    const newUrls: string[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${elevator.id}/${item.id}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('elevator_photos').upload(fileName, file);
      if (uploadError) {
        alert("Erro no upload: " + uploadError.message);
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage.from('elevator_photos').getPublicUrl(fileName);
      newUrls.push(publicUrl);
    }

    if (newUrls.length > 0) {
      const updatedPhotos = [...currentPhotos, ...newUrls];
      updateItem(item.id, 'photos_urls', updatedPhotos);
    }
    
    setUploadingItem(null);
    e.target.value = ''; // Reset input
  };

  const handleStartToggle = (item: any) => {
    const newStarted = !item.is_started;
    if (!newStarted) {
       updateItem(item.id, 'percentage', 0);
       updateItem(item.id, 'is_started', false);
    } else {
       updateItem(item.id, 'is_started', true);
    }
  };

  const checkGoldenRule = () => {
    if (elevator?.status !== 'pre_instalacao') return true;
    // Com a padronização das 10 etapas, a Regra de Ouro agora exige 100% em todas elas para avançar.
    return items.every(item => item.percentage === 100);
  };

  const calculateOverallProgress = () => {
     if(items.length === 0) return 0;
     const sum = items.reduce((acc, curr) => acc + curr.percentage, 0);
     return Math.round(sum / items.length);
  };

  const handleFinishElevator = async () => {
    setDeliveryModal(true);
  };

  const confirmDelivery = async () => {
    const dataAtual = new Date().toISOString();
    const { error } = await supabase.from('elevators').update({
       status: 'concluido',
       real_end_date: dataAtual
    }).eq('id', id);

    if (!error) {
      const { data: user } = await supabase.auth.getUser();
      const profile = user?.user ? await supabase.from('user_profiles').select('full_name').eq('id', user.user.id).single() : null;
      const userName = profile?.data?.full_name || 'Usuário';

      await supabase.from('elevator_history').insert({
         elevator_id: id,
         old_status: 'ajuste',
         new_status: 'concluido',
         notes: `A obra foi entregue ao cliente por ${userName}.`
      });

      alert('Elevador Entregue com Sucesso! Um marco extraordinário!');
      setDeliveryModal(false);
      navigate('/elevators?status=concluido');
    } else {
      alert('Erro ao confirmar entrega: ' + error.message);
    }
  };

  const handleAdvanceToMontagem = async () => {
    if (overall < 100) {
      alert('Não é possível avançar: Conclua todas as etapas desta fase (100%) primeiro.');
      return;
    }

    const openTickets = generalPendingItems.filter(p => p.status !== 'fechado');
    if (openTickets.length > 0) {
      alert('Não é possível avançar: Existem pendências em aberto. Resolva todas as pendências antes de avançar para a próxima fase.');
      return;
    }

    if (!checkGoldenRule()) {
      alert('Não é possível avançar: A Regra de Ouro (como Fechamento de Vãos) não foi cumprida.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('elevators').update({
       status: 'montagem',
       pre_install_end_date: today,
       assembly_start_date: today
    }).eq('id', id);

    if (!error) {
      await supabase.from('elevator_history').insert({
         elevator_id: id,
         old_status: 'pre_instalacao',
         new_status: 'montagem',
         notes: 'Fase de Pré-Instalação aprovada (100% concluída sem pendências).'
      });
      alert('Obra liberada para Montagem com sucesso!');
      fetchData();
    } else {
      alert('Erro ao avançar de fase: ' + error.message);
    }
  };

  const handleReturnToMontagem = async () => {
    if (!window.confirm("Atenção: Deseja realmente retroceder esta obra para a fase de montagem?")) return;

    const { error } = await supabase.from('elevators').update({
       status: 'montagem'
    }).eq('id', id);

    if (!error) {
      await supabase.from('elevator_history').insert({
         elevator_id: id,
         old_status: 'ajuste',
         new_status: 'montagem',
         notes: 'Retrocesso de fase: O administrador retornou a obra da fase de Ajuste para Montagem.'
      });
      alert('Obra retornada para a fase de Montagem com sucesso!');
      fetchData();
    } else {
      alert('Erro ao retornar fase: ' + error.message);
    }
  };

  const handleCreateTicket = async () => {
    if(!ticketDescription.trim()) return;
    const { data: user } = await supabase.auth.getUser();
    if(!user.user) return;
    
    setLoading(true);
    const { error } = await supabase.from('tickets').insert({
      company_id: elevator.company_id,
      elevator_id: elevator.id,
      title: `Problema: ${ticketModal.item_name}`,
      description: ticketDescription,
      status: 'aberto',
      ticket_type: 'chamado',
      created_by: user.user.id
    });

    setLoading(false);
    if(!error) {
       alert('Chamado / Ocorrência aberta com sucesso! A equipe de suporte foi notificada.');
       setTicketModal(null);
       setTicketDescription('');
    } else {
       alert('Erro ao abrir chamado: ' + error.message);
    }
  };

  const handleAddPendingItem = async () => {
    if (!newPendingItem.trim()) return;
    setAddingPending(true);
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      const { error } = await supabase.from('tickets').insert({
        company_id: elevator.company_id,
        elevator_id: elevator.id,
        title: `Pendência (${elevator.status.toUpperCase()})`,
        description: newPendingItem,
        status: 'aberto',
        ticket_type: 'pendencia',
        created_by: user.user.id
      });
      if (!error) {
        setNewPendingItem('');
        fetchData();
      } else {
        alert('Erro ao adicionar pendência: ' + error.message);
      }
    }
    setAddingPending(false);
  };

  const handleAddItemPending = async (item: any) => {
    const text = newItemPending[item.id];
    if (!text?.trim()) return;
    setAddingPending(true);
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      const { error } = await supabase.from('tickets').insert({
        company_id: elevator.company_id,
        elevator_id: elevator.id,
        title: item.item_name,
        description: text,
        status: 'aberto',
        ticket_type: 'pendencia',
        created_by: user.user.id
      });
      if (!error) {
        setNewItemPending(prev => ({ ...prev, [item.id]: '' }));
        fetchData();
      } else {
        alert('Erro ao adicionar pendência: ' + error.message);
      }
    }
    setAddingPending(false);
  };

  const handleTogglePendingItem = async (item: any) => {
    const newStatus = item.status === 'aberto' ? 'fechado' : 'aberto';
    const closedAt = newStatus === 'fechado' ? new Date().toISOString() : null;
    const { error } = await supabase.from('tickets').update({ status: newStatus, closed_at: closedAt }).eq('id', item.id);
    if (!error) {
      setGeneralPendingItems(prev => prev.map(p => p.id === item.id ? { ...p, status: newStatus, closed_at: closedAt } : p));
    }
  };

  const handleDeletePendingItem = async (item: any) => {
    if (!window.confirm("Deseja realmente excluir esta pendência?")) return;
    
    const { error } = await supabase.from('tickets').delete().eq('id', item.id);
    if (!error) {
      setGeneralPendingItems(prev => prev.filter(p => p.id !== item.id));
    } else {
      alert('Erro ao excluir pendência.');
    }
  };

  const overall = calculateOverallProgress();
  const isAjusteComplete = elevator?.status === 'ajuste';
  const isPreInstallReady = elevator?.status === 'pre_instalacao' && checkGoldenRule();

  if (loading) return <div style={{ padding: '24px' }}>Carregando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ padding: '8px' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.8rem', margin: 0 }}>
              Fase: <span style={{ color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>{elevator?.status.replace('_', ' ')}</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>Obra: {elevator?.name}</p>
          </div>
        </div>
        {isAjusteComplete && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={handleReturnToMontagem} style={{ padding: '12px 24px', fontSize: '1.1rem', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)' }}>
              VOLTAR PARA MONTAGEM
            </button>
            <button className="btn-glow border-green" onClick={handleFinishElevator} style={{ padding: '12px 24px', fontSize: '1.1rem' }}>
              ENTREGAR ELEVADOR
            </button>
          </div>
        )}
        {elevator?.status === 'pre_instalacao' && (
          <button className="btn-glow border-cyan" onClick={handleAdvanceToMontagem} style={{ padding: '12px 24px', fontSize: '1.1rem' }}>
            LIBERAR PARA MONTAGEM
          </button>
        )}
        {elevator?.status === 'pre_instalacao' && !checkGoldenRule() && (
          <div style={{ padding: '12px 16px', background: 'rgba(248, 113, 113, 0.1)', border: '1px solid var(--accent-red)', borderRadius: '8px', color: 'var(--accent-red)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16}/> Pendente: Regra de Ouro
          </div>
        )}
      </div>

      <div className={`neon-card border-${elevator?.status === 'montagem' ? 'purple' : 'cyan'}`} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>
            {elevator?.status === 'pre_instalacao' ? 'Índice de Montabilidade (IM)' : 'Progresso Geral da Fase'}
          </h3>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{overall}%</span>
        </div>
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ width: `${overall}%`, background: 'var(--accent-cyan)', height: '100%', transition: 'width 0.5s ease' }}></div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {items.map(item => (
          <div key={item.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ minWidth: '250px', flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editingItemId === item.id ? (
                  <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <input 
                      type="text" className="input-field" autoFocus
                      style={{ padding: '4px 8px', fontSize: '1.1rem', margin: 0 }}
                      value={editingName} 
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          updateItem(item.id, 'item_name', editingName);
                          setEditingItemId(null);
                        }
                      }}
                    />
                    <button className="btn btn-secondary" onClick={() => {
                        updateItem(item.id, 'item_name', editingName);
                        setEditingItemId(null);
                    }}>Salvar</button>
                  </div>
                ) : (
                  <h4 style={{ fontSize: '1.1rem', margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.percentage === 100 && item.is_started && <CheckCircle2 size={18} color="var(--accent-green)" />}
                    {renderItemName(item.item_name)}
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                      onClick={() => { setEditingItemId(item.id); setEditingName(item.item_name); }}>
                      <Edit2 size={14} />
                    </button>
                  </h4>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Iniciado?</span>
                  <button 
                    onClick={() => handleStartToggle(item)}
                    style={{
                      background: item.is_started ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)',
                      border: 'none', padding: '6px 16px', borderRadius: '20px', color: '#fff',
                      cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
                    }}>
                    {item.is_started ? 'SIM' : 'NÃO'}
                  </button>
                </div>

                {item.is_started && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[0, 25, 50, 75, 100].map(pct => (
                      <button
                        key={pct}
                        onClick={() => updateItem(item.id, 'percentage', pct)}
                        style={{
                          background: item.percentage >= pct ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                          border: '1px solid ' + (item.percentage >= pct ? 'var(--accent-cyan)' : 'var(--border-color)'),
                          color: item.percentage >= pct ? '#000' : 'var(--text-secondary)',
                          padding: '6px 12px',
                          borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s'
                        }}>
                        {pct}%
                      </button>
                    ))}
                  </div>
                )}

                {/* Toggle details button for all phases */}
                <button 
                  onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                  className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                  {expandedItemId === item.id ? 'Ocultar Detalhes' : 'Detalhes'}
                </button>
                <button 
                  onClick={() => setTicketModal(item)}
                  className="btn-glow border-red" style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--accent-red)' }}>
                  <AlertTriangle size={14} style={{ display: 'inline', marginRight: '4px' }} /> Abrir Chamado
                </button>
              </div>
            </div>

            {/* Expanded Details Section */}
            {expandedItemId === item.id && (
              <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                 
                 <div className="input-group">
                   <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MessageSquare size={14}/> Observações</label>
                   <textarea 
                     className="input-field" style={{ minHeight: '80px', resize: 'vertical' }}
                     defaultValue={item.notes || ''}
                     onBlur={(e) => updateItem(item.id, 'notes', e.target.value)}
                     placeholder="Anotações técnicas..."
                   />
                 </div>

                 <div className="input-group">
                   <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-red)' }}>
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
                         <button 
                            onClick={() => handleDeletePendingItem(p)}
                            title="Excluir pendência"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', padding: '0 4px', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={16} />
                         </button>
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
                       style={{ flex: 1, fontSize: '0.85rem', padding: '6px 10px' }}
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
                 {elevator?.status === 'montagem' && (
                   <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-yellow)' }}><Clock size={14}/> Lembretes</label>
                     <input 
                       type="text" className="input-field" 
                       defaultValue={item.reminders || ''}
                       onBlur={(e) => updateItem(item.id, 'reminders', e.target.value)}
                       placeholder="Ex: Trazer chave de torque na próxima visita..."
                     />
                   </div>
                 )}

                 <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <Camera size={14}/> Evidências (Máx: 3) 
                     <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>- {item.photos_urls?.length || 0}/3 fotos enviadas</span>
                   </label>
                   
                   <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                     <input 
                       type="file" 
                       accept="image/*" 
                       multiple 
                       className="input-field" 
                       style={{ flex: 1 }}
                       onChange={(e) => handleFileUpload(e, item)}
                       disabled={uploadingItem === item.id || (item.photos_urls?.length >= 3)}
                     />
                     {uploadingItem === item.id && <span style={{ color: 'var(--accent-cyan)' }}>Enviando...</span>}
                     {item.photos_urls?.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {item.photos_urls.map((url: string, idx: number) => (
                             <a key={idx} href={url} target="_blank" rel="noreferrer" className="badge badge-cyan" style={{ textDecoration: 'none' }}>Foto {idx + 1}</a>
                          ))}
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => updateItem(item.id, 'photos_urls', [])}>Limpar</button>
                        </div>
                     )}
                   </div>
                 </div>

              </div>
            )}
            
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '24px', marginTop: '24px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-red)', marginTop: 0 }}>
          <AlertTriangle size={20} /> Pendências e Chamados
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Anote aqui as pendências ou problemas relatados desta obra. Clique no ícone para marcá-las como resolvidas.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {generalPendingItems.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Nenhuma pendência anotada.</div>
          )}
          {generalPendingItems.map((p) => (
            <div key={p.id} style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', 
              background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px',
              borderLeft: p.status === 'fechado' ? '4px solid var(--accent-green)' : '4px solid var(--accent-red)'
            }}>
              <button 
                onClick={() => handleTogglePendingItem(p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.status === 'fechado' ? 'var(--accent-green)' : 'var(--text-secondary)', padding: 0, display: 'flex', alignItems: 'center' }}>
                {p.status === 'fechado' ? <CheckCircle2 size={20} /> : <div style={{ width: '18px', height: '18px', border: '2px solid var(--text-secondary)', borderRadius: '50%' }} />}
              </button>
              <div style={{ 
                color: 'white', flex: 1, 
                textDecoration: p.status === 'fechado' ? 'line-through' : 'none',
                opacity: p.status === 'fechado' ? 0.6 : 1
              }}>
                {p.title && <strong style={{ color: 'var(--accent-cyan)' }}>{p.title}: </strong>}
                {p.description}
              </div>
            </div>
          ))}
        </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Digite uma nova pendência..." 
              value={newPendingItem}
              onChange={(e) => setNewPendingItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPendingItem()}
              style={{ flex: 1 }}
            />
            <button 
              className="btn-glow border-red" 
              onClick={handleAddPendingItem} 
              disabled={addingPending || !newPendingItem.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} /> Adicionar Pendência
            </button>
          </div>
        </div>
      {ticketModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="neon-card border-red" style={{ width: '100%', maxWidth: '500px' }}>
            <h3 style={{ color: 'var(--accent-red)', marginTop: 0 }}>Abrir Chamado / Pendência</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Relate o problema impeditivo para: <strong style={{ color: 'white' }}>{ticketModal.item_name}</strong></p>
            
            <textarea 
               className="input-field" 
               rows={4} 
               placeholder="Descreva o problema ou pendência detalhadamente..."
               value={ticketDescription}
               onChange={(e) => setTicketDescription(e.target.value)}
               style={{ width: '100%', marginBottom: '16px', background: 'rgba(255,255,255,0.05)' }}
            />

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
               <button className="btn btn-secondary" onClick={() => setTicketModal(null)}>Cancelar</button>
               <button className="btn-glow border-red" onClick={handleCreateTicket} disabled={loading || !ticketDescription.trim()}>
                 {loading ? 'Enviando...' : 'Criar Chamado Oficial'}
               </button>
            </div>
          </div>
        </div>
      )}

      {deliveryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="neon-card border-green" style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-dark)' }}>
            <h3 style={{ color: 'var(--accent-green)', marginTop: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={24} /> Confirmar Entrega
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Deseja realmente entregar esta obra ao cliente? Essa ação irá mover a obra para o Histórico de Elevadores Entregues.
            </p>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
               <p style={{ margin: '0 0 8px 0' }}><span style={{ color: 'var(--text-secondary)' }}>Nome da Obra:</span> <strong style={{ color: 'white' }}>{elevator?.name}</strong></p>
               <p style={{ margin: '0 0 8px 0' }}><span style={{ color: 'var(--text-secondary)' }}>Cliente:</span> <strong style={{ color: 'white' }}>{elevator?.customer_company || 'Não informado'}</strong></p>
               <p style={{ margin: '0 0 8px 0' }}><span style={{ color: 'var(--text-secondary)' }}>Supervisor:</span> <strong style={{ color: 'white' }}>{elevator?.supervisor_name || 'Não informado'}</strong></p>
               <p style={{ margin: '0 0 8px 0' }}><span style={{ color: 'var(--text-secondary)' }}>Ajustador/Equipe:</span> <strong style={{ color: 'white' }}>{elevator?.team_name || 'Não informado'}</strong></p>
               <p style={{ margin: '0 0 8px 0' }}><span style={{ color: 'var(--text-secondary)' }}>Data Prevista:</span> <strong style={{ color: 'var(--accent-cyan)' }}>{(() => {
                 if (!elevator?.expected_end_date) return 'N/A';
                 const d = new Date(elevator.expected_end_date);
                 if (isNaN(d.getTime())) return String(elevator.expected_end_date);
                 return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
               })()}</strong></p>
               <p style={{ margin: '0' }}><span style={{ color: 'var(--text-secondary)' }}>Data Atual:</span> <strong style={{ color: 'var(--accent-green)' }}>{new Date().toLocaleDateString('pt-BR')}</strong></p>
            </div>

             <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
               <button className="btn btn-secondary" onClick={() => setDeliveryModal(false)}>Cancelar</button>
               <button className="btn-glow border-green" onClick={confirmDelivery}>
                 Confirmar Entrega
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
