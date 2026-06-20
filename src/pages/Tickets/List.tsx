import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, MessageSquare, CheckCircle2, Clock, Plus, Send, ArrowLeft, Trash2 } from 'lucide-react';

export default function TicketsList() {
  const [searchParams] = useSearchParams();
  const elevatorId = searchParams.get('elevator_id');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'aberto' | 'fechado'>('all');

  useEffect(() => {
    fetchTickets();
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if(user.user) {
      const { data: profile } = await supabase.from('user_profiles').select('company_id').eq('id', user.user.id).single();
      if(profile) {
        let query = supabase.from('tickets')
          .select(`*, elevators (name)`)
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false });
          
        if (elevatorId) {
           query = query.eq('elevator_id', elevatorId);
        }

        const { data } = await query;
        if(data) setTickets(data);
      }
    }
    setLoading(false);
  };

  const openTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    const { data } = await supabase.from('ticket_comments')
      .select('*, user_profiles(full_name)')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    
    // We didn't link ticket_comments.user_id to user_profiles directly via FK in schema yet, 
    // so let's just fetch comments and we'll show "Usuário" if join fails.
    if(data) setComments(data);
    else {
        // Fallback without join
        const { data: fbData } = await supabase.from('ticket_comments').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
        if(fbData) setComments(fbData);
    }
  };

  const handleAddComment = async () => {
    if(!newComment.trim() || !selectedTicket || !currentUser) return;
    
    const { error } = await supabase.from('ticket_comments').insert({
      ticket_id: selectedTicket.id,
      user_id: currentUser.id,
      comment: newComment
    });

    if(!error) {
      setNewComment('');
      openTicket(selectedTicket); // reload comments
    }
  };

  const handleCloseTicket = async () => {
    if(!selectedTicket) return;
    const { error } = await supabase.from('tickets').update({ status: 'fechado' }).eq('id', selectedTicket.id);
    if(!error) {
      setSelectedTicket({ ...selectedTicket, status: 'fechado' });
      fetchTickets(); // refresh list
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este chamado permanentemente?')) return;
    
    // Remove os comentários e o chamado (se o bd não tiver on delete cascade)
    await supabase.from('ticket_comments').delete().eq('ticket_id', id);
    const { error } = await supabase.from('tickets').delete().eq('id', id);
    
    if (!error) {
      if (selectedTicket?.id === id) setSelectedTicket(null);
      fetchTickets();
    } else {
      alert('Erro ao excluir chamado.');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', height: 'calc(100vh - 100px)' }}>
      
      {/* Left Panel: List of Tickets */}
      <div className="glass-panel" style={{ overflowY: 'auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {elevatorId && (
              <button className="btn btn-secondary" onClick={() => window.history.back()} style={{ padding: '6px', marginRight: '8px' }}>
                <ArrowLeft size={16} />
              </button>
            )}
            <AlertCircle color="var(--accent-cyan)" /> Caixa de Ocorrências
          </h2>
          
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
            <button 
              onClick={() => setFilter('all')} 
              style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: filter === 'all' ? 'var(--accent-cyan)' : 'transparent', color: filter === 'all' ? '#000' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold' }}>
              Todos
            </button>
            <button 
              onClick={() => setFilter('aberto')} 
              style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: filter === 'aberto' ? 'var(--accent-yellow)' : 'transparent', color: filter === 'aberto' ? '#000' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold' }}>
              Abertos
            </button>
            <button 
              onClick={() => setFilter('fechado')} 
              style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: filter === 'fechado' ? 'var(--accent-green)' : 'transparent', color: filter === 'fechado' ? '#000' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold' }}>
              Fechados
            </button>
          </div>
        </div>
        
        {loading ? <p>Carregando...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tickets.filter(t => filter === 'all' || t.status === filter).map(t => (
              <div 
                key={t.id} 
                onClick={() => openTicket(t)}
                style={{
                  background: selectedTicket?.id === t.id ? 'rgba(0,255,255,0.1)' : 'rgba(0,0,0,0.2)',
                  border: selectedTicket?.id === t.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  padding: '16px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{t.title}</span>
                  <span className={`badge ${t.status === 'aberto' ? 'badge-yellow' : 'badge-green'}`}>
                    {t.status.toUpperCase()}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {t.elevators?.name || 'Obra Desconhecida'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <Clock size={12} /> {new Date(t.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {tickets.filter(t => filter === 'all' || t.status === filter).length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Nenhuma ocorrência encontrada para este filtro.</p>}
          </div>
        )}
      </div>

      {/* Right Panel: Ticket Details & Chat */}
      <div className="neon-card border-cyan" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedTicket ? (
          <>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0' }}>{selectedTicket.title}</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Obra: {selectedTicket.elevators?.name}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedTicket.status !== 'fechado' && (
                    <button className="btn-glow border-green" onClick={handleCloseTicket} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                      <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '4px' }}/> Resolver
                    </button>
                  )}
                  <button onClick={() => handleDeleteTicket(selectedTicket.id)} className="btn-danger" style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Excluir Chamado">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: 'var(--text-primary)' }}><strong>Descrição Original:</strong> {selectedTicket.description}</p>
              </div>
            </div>

            {/* Comments Thread */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '8px' }}>
              {comments.map(c => (
                <div key={c.id} style={{ 
                  background: c.user_id === currentUser?.id ? 'rgba(0,255,255,0.1)' : 'rgba(255,255,255,0.05)', 
                  padding: '12px 16px', borderRadius: '8px',
                  alignSelf: c.user_id === currentUser?.id ? 'flex-end' : 'flex-start',
                  maxWidth: '80%'
                }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem' }}>{c.comment}</p>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
              {comments.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '24px' }}>Nenhum histórico de ações. Envie uma mensagem abaixo para registrar uma ação.</p>}
            </div>

            {/* Input Box */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Registrar ação tomada ou responder..." 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                style={{ margin: 0 }}
                disabled={selectedTicket.status === 'fechado'}
              />
              <button 
                className="btn-glow" 
                onClick={handleAddComment}
                disabled={selectedTicket.status === 'fechado'}
              >
                <Send size={18} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p>Selecione um chamado ao lado para visualizar o histórico.</p>
          </div>
        )}
      </div>

    </div>
  );
}
