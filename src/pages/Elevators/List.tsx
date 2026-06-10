import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Building2, Users, Wrench, Bell, CheckCircle2, TrendingUp, Edit, Trash2, UploadCloud, Download, XCircle, ChevronDown, ChevronUp, Search, Settings2, MapPin, Navigation, Send } from 'lucide-react';
import * as XLSX from 'xlsx';

// Subcomponent for each Elevator Card
const ElevatorCard = ({ elevator, onEdit, onDelete, onStartAjuste, realizedPct = 0 }: { elevator: any, onEdit: (el: any) => void, onDelete: (el: any) => void, onStartAjuste?: (el: any) => void, realizedPct?: number }) => {
  const navigate = useNavigate();
  const [realizado, setRealizado] = useState(realizedPct);

  useEffect(() => {
    setRealizado(realizedPct);
  }, [realizedPct]);
  const [liberacaoStatus, setLiberacaoStatus] = useState(elevator.liberacao_montagem || '🔴 AGUARDANDO FABRICAÇÃO');
  const [montagemPrevista, setMontagemPrevista] = useState(elevator.data_prevista_montagem || '');

  useEffect(() => {
    setLiberacaoStatus(elevator.liberacao_montagem || '🔴 AGUARDANDO FABRICAÇÃO');
    setMontagemPrevista(elevator.data_prevista_montagem || '');
  }, [elevator]);

  const calcExpected = () => {
    if(!elevator.start_date || !elevator.expected_end_date) return 0;
    const now = new Date();
    const start = new Date(elevator.start_date);
    const end = new Date(elevator.expected_end_date);
    if(now < start) return 0;
    if(now > end) return 100;
    return Math.round(((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100);
  };

  const getDaysInfo = () => {
    if(!elevator.start_date || !elevator.expected_end_date) return { decorridos: 0, restantes: 0, atraso: false };
    const now = new Date();
    const start = new Date(elevator.start_date);
    const end = new Date(elevator.expected_end_date);
    
    const diffTimeNow = Math.max(0, now.getTime() - start.getTime());
    const decorridos = Math.floor(diffTimeNow / (1000 * 60 * 60 * 24));
    
    const diffTimeEnd = end.getTime() - now.getTime();
    const restantes = Math.max(0, Math.ceil(diffTimeEnd / (1000 * 60 * 60 * 24)));
    
    const esperado = calcExpected();
    const atraso = (esperado > realizado && expected > 0) || (now > end && realizado < 100);

    return { decorridos, restantes, atraso };
  };

  const getDeliveryStatus = () => {
    if (elevator.status !== 'concluido' || !elevator.real_end_date) return null;
    if (!elevator.expected_end_date) return { text: '🟢 Entregue', color: 'var(--accent-green)', bg: 'rgba(52, 211, 153, 0.1)' };
    
    const realDateObj = new Date(elevator.real_end_date);
    const expDateObj = new Date(elevator.expected_end_date);
    
    if (isNaN(realDateObj.getTime()) || isNaN(expDateObj.getTime())) {
      return { text: '🟢 Entregue', color: 'var(--accent-green)', bg: 'rgba(52, 211, 153, 0.1)' };
    }
    
    const realDate = realDateObj.toISOString().split('T')[0];
    const expDate = expDateObj.toISOString().split('T')[0];
    if (realDate < expDate) return { text: '🟢 Entrega Antecipada', color: 'var(--accent-green)', bg: 'rgba(52, 211, 153, 0.1)' };
    if (realDate === expDate) return { text: '🟢 Entrega no Prazo', color: 'var(--accent-green)', bg: 'rgba(52, 211, 153, 0.1)' };
    return { text: '🔴 Entrega Atrasada', color: 'var(--accent-red)', bg: 'rgba(248, 113, 113, 0.1)' };
  };

  const expected = calcExpected();
  const { decorridos, restantes, atraso } = getDaysInfo();
  const deliveryStatus = getDeliveryStatus();

  const handleTestTelegram = async () => {
    const { error } = await supabase.functions.invoke('chatbot-cron', {
      body: { elevator_id: elevator.id }
    });
    if (error) alert('Erro ao testar: ' + error.message);
    else alert('Sinal enviado! Verifique o Telegram.');
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border-color)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold' }}>{elevator.name} {elevator.project_name ? `- ${elevator.project_name}` : ''}</h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>
            Fase Atual: <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{elevator.status === 'concluido' ? 'ENTREGUE' : elevator.status.replace('_', ' ')}</span>
          </p>
          {deliveryStatus && (
             <div style={{ marginTop: '8px', padding: '4px 8px', borderRadius: '4px', background: deliveryStatus.bg, color: deliveryStatus.color, display: 'inline-block', fontSize: '0.85rem', fontWeight: 'bold', border: `1px solid ${deliveryStatus.color}` }}>
               {deliveryStatus.text}
             </div>
          )}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '4px', fontSize: '0.85rem' }}>
          {elevator.model || 'Modelo ñ def.'}
        </div>
      </div>

      {/* Realizado Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={16} color="var(--accent-cyan)"/> Realizado:
          </span>
          <span style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{realizado}%</span>
        </div>
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px' }}>
          <div style={{ width: `${realizado}%`, background: 'var(--accent-cyan)', height: '100%', borderRadius: '3px', transition: 'width 0.5s' }}></div>
        </div>
      </div>

      {/* Info Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Building2 size={16}/> {elevator.customer_company || 'Empresa ñ def.'}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={16}/> {elevator.team_name || 'Equipe ñ def.'}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Wrench size={16}/> {elevator.mechanic_name || 'Técnico ñ def.'}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)' }}><Bell size={16}/> Semanal</span>
      </div>

      {/* Esperado Bar */}
      <div style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
            <TrendingUp size={16} color="var(--accent-yellow)"/> Esperado (Linear):
          </span>
          <span style={{ fontWeight: 'bold', color: 'var(--accent-yellow)' }}>{expected}%</span>
        </div>
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px' }}>
          <div style={{ width: `${expected}%`, background: 'var(--accent-yellow)', height: '100%', borderRadius: '3px', transition: 'width 0.5s' }}></div>
        </div>
      </div>

      {/* Pre-Installation Logistics */}
      {elevator.status === 'pre_instalacao' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>📦 Expedição:</span>
            <span style={{ fontWeight: 'bold' }}>
              {elevator.data_prevista_expedicao ? new Date(elevator.data_prevista_expedicao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '---'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>🚚 Previsão de Chegada:</span>
            <span style={{ fontWeight: 'bold' }}>
              {elevator.data_prevista_chegada ? new Date(elevator.data_prevista_chegada).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '---'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>🏗️ Montagem Prevista:</span>
            <input 
              type="date"
              value={montagemPrevista}
              onChange={async (e) => {
                const newVal = e.target.value;
                setMontagemPrevista(newVal);
                const { error } = await supabase.from('elevators').update({ data_prevista_montagem: newVal || null }).eq('id', elevator.id);
                if (error) {
                  alert('Erro ao atualizar data: ' + error.message);
                  setMontagemPrevista(elevator.data_prevista_montagem || ''); // revert
                }
              }}
              style={{ 
                fontWeight: 'bold', 
                fontSize: '0.85rem',
                padding: '2px 8px', 
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: 'white',
                cursor: 'pointer',
                outline: 'none',
                textAlign: 'right'
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>🔧 Liberação para Montagem:</span>
            <select 
              value={liberacaoStatus}
              onChange={async (e) => {
                const newVal = e.target.value;
                setLiberacaoStatus(newVal);
                const { error } = await supabase.from('elevators').update({ liberacao_montagem: newVal }).eq('id', elevator.id);
                if (error) {
                  alert('Erro ao atualizar status: ' + error.message);
                  setLiberacaoStatus(elevator.liberacao_montagem || '🔴 AGUARDANDO FABRICAÇÃO'); // revert
                }
              }}
              style={{ 
                fontWeight: 'bold', 
                fontSize: '0.85rem',
                padding: '2px 8px', 
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: liberacaoStatus.includes('🟢') ? 'rgba(52, 211, 153, 0.2)' : liberacaoStatus.includes('🟡') ? 'rgba(250, 204, 21, 0.2)' : liberacaoStatus.includes('✅') ? 'rgba(59, 130, 246, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                color: liberacaoStatus.includes('🟢') ? '#34d399' : liberacaoStatus.includes('🟡') ? '#facc15' : liberacaoStatus.includes('✅') ? '#60a5fa' : '#f87171',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                textAlign: 'center'
              }}
            >
              {liberacaoStatus !== '✅ MATERIAL PARADO EM CAMPO' && (
                <option value={liberacaoStatus} style={{ color: 'black' }}>{liberacaoStatus}</option>
              )}
              {liberacaoStatus === '✅ MATERIAL PARADO EM CAMPO' && elevator.liberacao_montagem && elevator.liberacao_montagem !== '✅ MATERIAL PARADO EM CAMPO' && (
                <option value={elevator.liberacao_montagem} style={{ color: 'black' }}>{elevator.liberacao_montagem}</option>
              )}
              {liberacaoStatus === '✅ MATERIAL PARADO EM CAMPO' && (!elevator.liberacao_montagem || elevator.liberacao_montagem === '✅ MATERIAL PARADO EM CAMPO') && (
                <option value="🔴 AGUARDANDO FABRICAÇÃO" style={{ color: 'black' }}>🔴 AGUARDANDO FABRICAÇÃO</option>
              )}
              <option value="✅ MATERIAL PARADO EM CAMPO" style={{ color: 'black' }}>✅ MATERIAL PARADO EM CAMPO</option>
            </select>
          </div>
        </div>
      )}

      {/* Tempo Info (Only if not pre_instalacao or if you want it everywhere) */}
      {elevator.status !== 'pre_instalacao' && elevator.status !== 'concluido' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
          <div>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Decorridos: <strong style={{color: 'white'}}>{decorridos}d</strong></p>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>Restantes: <strong style={{color: 'white'}}>{restantes}d</strong></p>
          </div>
          {atraso && (
            <div style={{ background: 'rgba(255, 59, 48, 0.2)', color: 'var(--accent-red)', padding: '4px 12px', borderRadius: '4px', border: '1px solid var(--accent-red)', fontWeight: 'bold' }}>
              Atraso
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
        {elevator.status === 'ajuste' && (!elevator.team_name || elevator.team_name === 'Equipe ñ def.') && onStartAjuste ? (
          <button className="btn-glow border-purple" style={{ width: '100%', padding: '12px' }} onClick={() => onStartAjuste(elevator)}>
            Iniciar Ajuste
          </button>
        ) : (
          <button className="btn-glow" style={{ width: '100%', padding: '12px' }} onClick={() => navigate(`/elevators/${elevator.id}/hub`)}>
            Acompanhar Fases &gt;
          </button>
        )}
        {/* Admin Actions (Minimalist) */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '4px', transition: 'color 0.2s' }}
            onMouseOver={e => e.currentTarget.style.color = '#60a5fa'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            title="Testar Robô (Telegram)"
            onClick={(e) => { e.stopPropagation(); handleTestTelegram(); }}
          >
            <Send size={14} /> Testar
          </button>
          
          <button 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '4px', transition: 'color 0.2s' }}
            onMouseOver={e => e.currentTarget.style.color = '#fff'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onClick={(e) => { e.stopPropagation(); onEdit(elevator); }}
          >
            <Edit size={14} /> Editar
          </button>

          <button 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '4px', transition: 'color 0.2s' }}
            onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onClick={(e) => { e.stopPropagation(); onDelete(elevator); }}
          >
            <Trash2 size={14} /> Excluir
          </button>
        </div>
      </div>

    </div>
  );
};

const ProjectGroupCard = ({ group, colorClass, accentColor, onEdit, onDelete, onStartAjuste, progressMap }: { group: any, colorClass: string, accentColor: string, onEdit: (el: any) => void, onDelete: (el: any) => void, onStartAjuste?: (el: any) => void, progressMap: Record<string, number> }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className={`neon-card ${colorClass}`} style={{ padding: '24px', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', flex: 1 }} 
          onClick={() => setIsOpen(true)}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
            <Building2 size={18} color={accentColor} /> {group.title}
          </div>
          
          {group.address !== 'Sem Endereço' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {group.address}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(group.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: '0.8rem', color: '#60a5fa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'rgba(96, 165, 250, 0.1)', borderRadius: '4px', transition: 'all 0.2s' }}
                >
                  <MapPin size={14} /> Google Maps
                </a>
                <a 
                  href={`https://waze.com/ul?q=${encodeURIComponent(group.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: '0.8rem', color: '#34d399', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '4px', transition: 'all 0.2s' }}
                >
                  <Navigation size={14} /> Waze
                </a>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {group.address}
            </div>
          )}
          
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Contrato: <span style={{ color: '#fff', fontWeight: 500 }}>{group.contract}</span>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
             <div>
               <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total de equipamentos:</div>
               <div style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: '1', color: '#fff' }}>{group.items.length}</div>
             </div>
             {group.title && group.title !== 'Obra sem Empreendimento' && (
               <button 
                 className="btn btn-secondary"
                 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', borderColor: 'rgba(96, 165, 250, 0.3)', padding: '8px 16px', fontSize: '0.9rem' }}
                 onClick={(e) => {
                   e.stopPropagation();
                   const link = `${window.location.origin}/mestre/${encodeURIComponent(group.title)}`;
                   navigator.clipboard.writeText(link);
                   alert('Link do Portal do Mestre copiado para a área de transferência:\n\n' + link);
                 }}
               >
                 <Navigation size={14} /> Link do Mestre
               </button>
             )}
          </div>
          </div>
        </div>
        <div style={{ color: accentColor, background: 'rgba(255, 255, 255, 0.05)', padding: '8px', borderRadius: '50%' }}>
          <Search size={20} />
        </div>
      </div>

      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          padding: '40px 20px',
          overflowY: 'auto'
        }} onClick={() => setIsOpen(false)}>
          <div 
            className={`neon-card ${colorClass}`} 
            style={{ 
              width: '100%', maxWidth: '1400px', 
              padding: '40px', 
              background: '#0f172a',
              position: 'relative',
              animation: 'fadeInUp 0.3s ease-out'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsOpen(false)}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,59,48,0.2)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <XCircle size={28} />
            </button>
            
            <div style={{ marginBottom: '40px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ margin: '0 0 12px 0', color: accentColor, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '2.2rem' }}>
                <Building2 size={36} /> {group.title}
              </h2>
              <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                <span>{group.address}</span>
                <span>•</span>
                <span>Contrato: <strong style={{color: '#fff'}}>{group.contract}</strong></span>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
              {group.items.map((el: any) => (
                <ElevatorCard key={el.id} elevator={el} onEdit={onEdit} onDelete={onDelete} onStartAjuste={onStartAjuste} realizedPct={progressMap[el.id] || 0} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default function ElevatorsList() {
  const [elevators, setElevators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');
  const branchFilter = searchParams.get('branch');
  const regionFilter = searchParams.get('region');
  const countryFilter = searchParams.get('country');
  const supervisorFilter = searchParams.get('supervisor');
  
  // Modal Edit State
  const [editModal, setEditModal] = useState<any>(null);
  const [importModal, setImportModal] = useState(false);
  const [importReport, setImportReport] = useState<any>(null);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [usersList, setUsersList] = useState<any[]>([]);
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [tecnicosList, setTecnicosList] = useState<any[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [searchText, setSearchText] = useState('');

  const groupedElevators = useMemo(() => {
    let filtered = elevators.filter(el => {
      let keep = true;
      if (statusFilter) keep = keep && String(el.status) === String(statusFilter);
      if (branchFilter) keep = keep && String(el.branch) === String(branchFilter);
      if (regionFilter) keep = keep && String(el.region) === String(regionFilter);
      if (countryFilter) keep = keep && String(el.country || 'Brasil') === String(countryFilter);
      if (supervisorFilter) keep = keep && String(el.supervisor_name) === String(supervisorFilter);
      return keep;
    });
    
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      filtered = filtered.filter(el => 
        (el.equipment_id && el.equipment_id.toLowerCase().includes(lowerSearch)) ||
        (el.project_name && el.project_name.toLowerCase().includes(lowerSearch)) ||
        (el.contract_number && String(el.contract_number).toLowerCase().includes(lowerSearch))
      );
    }

    const groups: { [key: string]: { title: string, address: string, contract: string, items: any[] } } = {};
    
    filtered.forEach(el => {
      let key = '';
      if (el.contract_number && String(el.contract_number).trim() !== '') {
        key = `contract_${String(el.contract_number).trim()}`;
      } else if (el.project_name && String(el.project_name).trim() !== '' && el.address && String(el.address).trim() !== '') {
        key = `project_${String(el.project_name).trim()}_${String(el.address).trim()}`;
      } else {
        key = `single_${el.id}`;
      }
      
      if (!groups[key]) {
        groups[key] = {
          title: el.project_name || 'Obra sem Empreendimento',
          address: el.address || 'Sem Endereço',
          contract: el.contract_number || 'Sem Contrato',
          items: []
        };
      }
      groups[key].items.push(el);
    });
    
    return Object.values(groups);
  }, [elevators, statusFilter, searchText]);

  useEffect(() => {
    fetchElevators();
    supabase.from('user_profiles').select('id, full_name, role, region_name, branch_name, company_id').order('full_name').then(({data}) => {
      if(data) setUsersList(data);
    });
    supabase.from('empresas_contratadas').select('id, nome_fantasia').order('nome_fantasia').then(({data}) => {
      if(data) setCompaniesList(data);
    });
    supabase.from('tecnicos_empresas').select('id, nome, funcao, empresa_id, telefone, telegram_id').order('nome').then(({data}) => {
      if(data) setTecnicosList(data);
    });
  }, []);

  const fetchElevators = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    
    const { data: profile } = await supabase.from('user_profiles').select('company_id, role, branch_name, can_register_users').eq('id', user.user.id).single();
    if (!profile) return;
    
    let query = supabase.from('elevators').select('*').order('created_at', { ascending: false });
    
    // Only restrict visibility for mechanics. Managers/Supervisors see everything.
    if (profile.company_id && ['montador', 'ajustador', 'pre_instalador'].includes(profile.role)) {
      query = query.eq('company_id', profile.company_id);
    }

    if (!profile.can_register_users && ['supervisor', 'ajustador', 'pre_instalador'].includes(profile.role)) {
      if (profile.branch_name && profile.branch_name.trim() !== '') {
        const branches = profile.branch_name.split(',').map((b: string) => b.trim()).filter(Boolean);
        if (branches.length > 1) {
          query = query.in('branch', branches);
        } else {
          query = query.eq('branch', branches[0]);
        }
      } else {
        // Se não tem filial cadastrada, bloqueia tudo para não vazar dados
        query = query.eq('branch', 'BLOQUEADO_SEM_FILIAL');
      }
    }

    
    const { data } = await query;
    if (data) {
       setElevators(data);
       
       // Bulk fetch progress
       const [pre, asm, adj] = await Promise.all([
         supabase.from('pre_installation_checklists').select('elevator_id, percentage'),
         supabase.from('assembly_checklists').select('elevator_id, percentage'),
         supabase.from('adjustment_checklists').select('elevator_id, percentage')
       ]);
       
       const pMap: Record<string, number> = {};
       
       data.forEach(el => {
         if(el.status === 'concluido') {
           pMap[el.id] = 100;
           return;
         }
         
         let items: any[] = [];
         if(el.status === 'pre_instalacao') items = pre.data?.filter(i => i.elevator_id === el.id) || [];
         else if(el.status === 'montagem') items = asm.data?.filter(i => i.elevator_id === el.id) || [];
         else if(el.status === 'ajuste') items = adj.data?.filter(i => i.elevator_id === el.id) || [];
         
         if(items.length > 0) {
           const sum = items.reduce((acc, curr) => acc + curr.percentage, 0);
           pMap[el.id] = Math.round(sum / items.length);
         } else {
           pMap[el.id] = 0;
         }
       });
       
       setProgressMap(pMap);
    }
  };

  const handleClearDatabase = async () => {
    if(!confirm("ATENÇÃO! Isso vai apagar TODAS as obras cadastradas no sistema. Tem certeza?")) return;
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if(user?.user) {
       const { data: profile } = await supabase.from('user_profiles').select('company_id').eq('id', user.user.id).single();
       if(profile) {
           const { error } = await supabase.rpc('clear_company_elevators', { p_company_id: profile.company_id });
           if(error) alert('Erro: ' + error.message);
           else {
             alert('Base limpa com sucesso!');
             fetchElevators();
           }
       }
    }
    setLoading(false);
  };

  const handleCreateTestElevator = async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if(user.user) {
       const { data: profile } = await supabase.from('user_profiles').select('company_id').eq('id', user.user.id).single();
       if(profile) {
           const randId = Math.floor(Math.random() * 1000);
           const { error } = await supabase.from('elevators').insert({
               name: 'Elevador Obra #' + randId,
               project_name: 'Obra de Teste #' + randId,
               company_id: profile.company_id,
               status: 'pre_instalacao'
           });
           if(error) alert('Erro: ' + error.message);
           else fetchElevators();
       }
    }
    setLoading(false);
  };

  const handleDelete = async (elevator: any) => {
    if (confirm(`Tem certeza que deseja excluir "${elevator.name}"? Esta ação não pode ser desfeita.`)) {
      setLoading(true);
      const { error } = await supabase.from('elevators').delete().eq('id', elevator.id);
      setLoading(false);
      
      if (error) {
        alert('Erro ao excluir: ' + error.message);
      } else {
        alert('Obra excluída com sucesso.');
        fetchElevators();
      }
    }
  };

  const handleStartAjuste = async (el: any) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;
    const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user.user.id).single();
    if (!profile) return;
    
    const { error } = await supabase.from('elevators').update({
      team_name: profile.full_name
    }).eq('id', el.id);

    if (!error) {
      alert(`Ajuste iniciado! Você (${profile.full_name}) foi registrado como o ajustador responsável.`);
      fetchElevators();
    } else {
      alert('Erro ao iniciar ajuste: ' + error.message);
    }
  };

  const saveEdit = async () => {
    if(!editModal) return;
    const { error } = await supabase.from('elevators').update({
       name: editModal.name,
       customer_company: editModal.customer_company,
       empresa_contratada_id: editModal.empresa_contratada_id || null,
       start_date: editModal.start_date || null,
       expected_end_date: editModal.expected_end_date || null,
       team_name: editModal.team_name,
       mechanic_name: editModal.mechanic_name,
       address: editModal.address,
       model: editModal.model,
       passenger_capacity: editModal.passenger_capacity,
       speed: editModal.speed,
       stops: editModal.stops ? parseInt(editModal.stops) : null,
       equipment_id: editModal.equipment_id,
       project_name: editModal.project_name,
       contract_number: editModal.contract_number,
       branch: editModal.branch,
       country: editModal.country || 'Brasil',
       region: editModal.region,
       supervisor_name: editModal.supervisor_name,
       client_emails: editModal.client_emails,
       mestre_nome: editModal.mestre_nome,
       mestre_telefone: editModal.mestre_telefone,
       mestre_telegram: editModal.mestre_telegram
    }).eq('id', editModal.id);
    
    if(error) alert(error.message);
    else {
      setEditModal(null);
      fetchElevators();
    }
  };

  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0];
    if(!file) return;

    if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.xlsx')) {
       alert("Erro: Formato inválido. Por favor, envie um arquivo Excel (.xlsx) ou .CSV.");
       e.target.value = ''; // Reset input
       return;
    }

    try {
        setLoading(true);
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Transforma em array de arrays. defval garante que colunas vazias nao sejam omitidas
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        if(rows.length < 2) {
            alert("O arquivo precisa ter cabeçalho e pelo menos 1 linha de dados.");
            setLoading(false);
            return;
        }

        // Anti-garbage guard: Se a primeira célula tiver caracteres de controle binários, o arquivo está corrompido
        const sampleStr = String(rows[0][0] || '');
        if (/[\x00-\x08\x0E-\x1F]/.test(sampleStr)) {
            alert("⚠️ Erro Crítico: O formato do seu Excel não pôde ser lido corretamente pelo navegador (parece estar corrompido ou salvo em um formato incompatível). Por favor, abra-o no Excel e SALVE COMO .CSV (Separado por vírgulas) e tente enviar o .csv.");
            setLoading(false);
            e.target.value = '';
            return;
        }
        
        const { data: user } = await supabase.auth.getUser();
        if(!user?.user) return;
        const { data: profile } = await supabase.from('user_profiles').select('company_id').eq('id', user.user.id).single();
        if(!profile) return;

        let count = 0;
        let stats = { kept: 0, movedMontagem: 0, movedAjuste: 0, movedEntregue: 0 };
        const totalRows = rows.length - 1;
        setImportProgress({ current: 0, total: totalRows });
        
        // Encontrar qual linha é o cabeçalho (pode haver títulos soltos nas primeiras linhas)
        let headerRowIndex = 0;
        let headers: string[] = [];
        for(let r=0; r < Math.min(5, rows.length); r++) {
            const rowStr = rows[r].map(h => String(h).toLowerCase().trim());
            // Se a linha tem palavras-chave comuns de tabela, assumimos que é o cabeçalho
            const matches = rowStr.filter(h => h.includes('id') || h.includes('nome') || h.includes('obra') || h.includes('empresa') || h.includes('modelo') || h.includes('data') || h.includes('capacidade') || h.includes('endere')).length;
            if(matches >= 2) {
                headerRowIndex = r;
                headers = rowStr;
                break;
            }
        }
        if(headers.length === 0) headers = rows[0].map(h => String(h).toLowerCase().trim());

        const findCol = (aliases: string[]) => headers.findIndex(h => aliases.some(a => h === a || h.includes(a)));
        const findColExact = (aliases: string[]) => headers.findIndex(h => aliases.some(a => h === a));

        const idxName = findCol(['elevador']);
        const idxProject = findCol(['cliente']);
        const idxCompany = -1;
        const idxAddress = findCol(['endereço', 'endereco']);
        const idxCity = findCol(['cidade']);
        const idxEquipId = findCol(['elevador']);
        const idxModel = findCol(['linha']);
        const idxCapacity = findCol(['capacid', 'capacidade']);
        const idxSpeed = findCol(['veloc', 'velocidade']);
        const idxStops = findCol(['paradas']);
        const idxStart = findCol(['data_inicio', 'inicio', 'início', 'data inicio']);
        const idxEnd = findCol(['data_fim', 'fim', 'data fim', 'entrega', 'previsão']);
        const idxContract = findCol(['contrato']);
        const idxBranch = findCol(['filial']);
        const idxCountry = findCol(['país', 'pais', 'country']);
        const idxRegion = findCol(['região', 'regiao']);
        const idxSupervisor = findCol(['supervisor', 'líder', 'lider']);
        
        const idxPrevMontagem = findCol(['cc+cm', 'cc + cm', 'previsao montagem', 'previsão montagem', 'prev montagem', 'previsao de montagem']);
        const idxCC = findColExact(['cc', 'cabina', 'cc ']); // exact to avoid matching cc+cm
        const idxCM = findColExact(['cm', 'contramarco', 'contra marco', 'cm ']);
        
        let idxExpedicao = findCol(['expedid. prevista', 'exped. prevista', 'expedid prevista', 'expedicao prevista', 'expedição prevista']);
        if (idxExpedicao === -1) {
            idxExpedicao = findCol(['expedição', 'expedicao', 'semana', 'forecast']);
        }
        
        const idxFase = findCol(['fase', 'status', 'etapa', 'fase inst.']);

        const parseAnyDate = (val: any) => {
            if (!val) return null;
            const str = String(val).trim();
            if (/^\d{5}$/.test(str)) {
                const serial = parseInt(str);
                const utc_days = Math.floor(serial - 25569);
                const date_info = new Date(utc_days * 86400 * 1000);
                return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate() + 1);
            }
            const mDate = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
            if (mDate) return new Date(parseInt(mDate[3]), parseInt(mDate[2]) - 1, parseInt(mDate[1]));
            const d = new Date(str);
            if (!isNaN(d.getTime())) return d;
            return null;
        };

        const parseWeekToDate = (weekStr: string) => {
            if (!weekStr) return null;
            const str = String(weekStr).trim().toUpperCase();
            
            const anyDate = parseAnyDate(weekStr);
            if (anyDate && !str.includes('W') && !str.includes('SEM')) return anyDate;

            let year = new Date().getFullYear();
            let week = 0;
            const m1 = str.match(/(\d{4})[-W\s]+(\d{1,2})/); 
            const m2 = str.match(/(\d{1,2})\/(\d{4})/); 
            const m3 = str.match(/SEM.*?(\d{1,2})/); 
            const m4 = str.match(/^(\d{1,2})$/); 
            
            if (m1) { year = parseInt(m1[1]); week = parseInt(m1[2]); }
            else if (m2) { week = parseInt(m2[1]); year = parseInt(m2[2]); }
            else if (m3) { week = parseInt(m3[1]); }
            else if (m4) { week = parseInt(m4[1]); }
            else return null;
            
            const firstDayOfYear = new Date(year, 0, 1);
            const days = (week - 1) * 7;
            const targetDate = new Date(year, 0, 1 + days);
            const day = targetDate.getDay();
            const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(targetDate.setDate(diff));
        };
    
    // Pular até a linha após o cabeçalho
    for(let i = headerRowIndex + 1; i < rows.length; i++){
        setImportProgress({ current: i - headerRowIndex, total: rows.length - headerRowIndex - 1 });
        const cols = rows[i];
        
        if(cols.length >= 1) {
            // Se não achou a coluna de ID, assume que é a primeira (0)
            const name = idxName !== -1 ? String(cols[idxName] || '').trim() : String(cols[0] || '').trim();
            if(!name || name === '') continue;
            
            const project_name = idxProject !== -1 ? String(cols[idxProject] || '').trim() : '';
            const company = '';
            const addressBase = idxAddress !== -1 ? String(cols[idxAddress] || '').trim() : '';
            const city = idxCity !== -1 ? String(cols[idxCity] || '').trim() : '';
            const address = addressBase + (addressBase && city ? ' - ' : '') + city;
            const equipment_id = idxEquipId !== -1 ? String(cols[idxEquipId] || '').trim() : '';
            const model = idxModel !== -1 ? String(cols[idxModel] || '').trim() : '';
            const passenger_capacity = idxCapacity !== -1 ? String(cols[idxCapacity] || '').trim() : '';
            const speed = idxSpeed !== -1 ? String(cols[idxSpeed] || '').trim() : '';
            const stops = idxStops !== -1 && cols[idxStops] ? parseInt(cols[idxStops]) : null;
            const startObj = idxStart !== -1 && cols[idxStart] ? parseAnyDate(cols[idxStart]) : null;
            const endObj = idxEnd !== -1 && cols[idxEnd] ? parseAnyDate(cols[idxEnd]) : null;
            const start = startObj ? startObj.toISOString() : null;
            const end = endObj ? endObj.toISOString() : null;
            const contract = idxContract !== -1 ? String(cols[idxContract] || '').trim() : '';
            const branch = idxBranch !== -1 ? String(cols[idxBranch] || '').trim() : '';
            const country = idxCountry !== -1 ? String(cols[idxCountry] || '').trim() : 'Brasil';
            const region = idxRegion !== -1 ? String(cols[idxRegion] || '').trim() : '';
            const supervisor = idxSupervisor !== -1 ? String(cols[idxSupervisor] || '').trim() : '';

            const rawCC = idxCC !== -1 ? String(cols[idxCC] || '').trim().toUpperCase() : '';
            const rawCM = idxCM !== -1 ? String(cols[idxCM] || '').trim().toUpperCase() : '';
            const cc_status = rawCC === 'SIM' || rawCC === 'S' || rawCC === 'OK' ? 'SIM' : rawCC === '' ? null : 'NÃO';
            const cm_status = rawCM === 'SIM' || rawCM === 'S' || rawCM === 'OK' ? 'SIM' : rawCM === '' ? null : 'NÃO';
            
            let liberacao_montagem = '🔴 AGUARDANDO FABRICAÇÃO';
            if (cc_status === 'SIM' && cm_status === 'SIM') liberacao_montagem = '🟢 LIBERADO PARA MONTAGEM';
            else if (cc_status === 'SIM' || cm_status === 'SIM') liberacao_montagem = '🟡 LIBERAÇÃO PARCIAL';

            const rawExp = idxExpedicao !== -1 ? String(cols[idxExpedicao] || '').trim() : '';
            const data_prevista_expedicao = parseWeekToDate(rawExp);
            
            const rawPrevMontagem = idxPrevMontagem !== -1 ? String(cols[idxPrevMontagem] || '').trim() : '';
            const explicitPrevMontagem = parseWeekToDate(rawPrevMontagem);
            
            let data_prevista_chegada = null;
            let data_prevista_montagem = null;
            if (data_prevista_expedicao) {
                data_prevista_chegada = new Date(data_prevista_expedicao);
                data_prevista_chegada.setDate(data_prevista_chegada.getDate() + 7);
            }
            
            let final_expedicao = data_prevista_expedicao;
            let final_chegada = data_prevista_chegada;
            
            if (explicitPrevMontagem) {
                data_prevista_montagem = explicitPrevMontagem;
                if (!final_chegada) {
                    final_chegada = new Date(explicitPrevMontagem);
                    final_chegada.setDate(final_chegada.getDate() - 3);
                }
                if (!final_expedicao) {
                    final_expedicao = new Date(final_chegada);
                    final_expedicao.setDate(final_expedicao.getDate() - 7);
                }
            } else if (final_chegada) {
                data_prevista_montagem = new Date(final_chegada);
                data_prevista_montagem.setDate(data_prevista_montagem.getDate() + 3);
            }
            
            const expStr = final_expedicao ? final_expedicao.toISOString().split('T')[0] : null;
            const cheStr = final_chegada ? final_chegada.toISOString().split('T')[0] : null;
            const monStr = data_prevista_montagem ? data_prevista_montagem.toISOString().split('T')[0] : null;

            const rawFase = idxFase !== -1 ? String(cols[idxFase] || '').trim().toLowerCase() : '';
            let parsedStatus = 'pre_instalacao';
            
            if (rawFase.includes('montagem') || rawFase === 'mon') parsedStatus = 'montagem';
            else if (rawFase.includes('ajuste') || rawFase === 'aj') parsedStatus = 'ajuste';
            else if (['entregue', 'entrega', 'concluído', 'concluido', 'finalizado', 'encerrado'].some(kw => rawFase.includes(kw))) parsedStatus = 'concluido';

            const payload = {
                name: name,
                project_name: project_name,
                customer_company: company,
                address: address,
                equipment_id: equipment_id,
                model: model,
                passenger_capacity: passenger_capacity,
                speed: speed,
                stops: stops,
                start_date: start,
                expected_end_date: end,
                contract_number: contract,
                branch: branch,
                country: country || 'Brasil',
                region: region,
                cc_status,
                cm_status,
                liberacao_montagem,
                data_prevista_expedicao: expStr,
                data_prevista_chegada: cheStr,
                data_prevista_montagem: monStr
            };

            let existing = null;
            if (equipment_id) {
               const { data } = await supabase.from('elevators')
                 .select('id')
                 .eq('equipment_id', equipment_id)
                 .eq('company_id', profile.company_id)
                 .maybeSingle();
               existing = data;
            } else {
               const { data } = await supabase.from('elevators')
                 .select('id')
                 .eq('name', name)
                 .eq('company_id', profile.company_id)
                 .maybeSingle();
               existing = data;
            }

            if (existing) {
                // Update
                const { error } = await supabase.from('elevators')
                  .update(payload)
                  .eq('id', existing.id);
                if (!error) {
                    count++;
                    const { data: syncRes } = await supabase.rpc('sync_elevator_phase_from_import', { p_elevator_id: existing.id, p_new_status: parsedStatus, p_user_id: user.user.id });
                    if(syncRes === 'MOVED_MONTAGEM') stats.movedMontagem++;
                    else if(syncRes === 'MOVED_AJUSTE') stats.movedAjuste++;
                    else if(syncRes === 'MOVED_ENTREGUE') stats.movedEntregue++;
                    else stats.kept++;
                } else console.error("Erro ao atualizar:", error);
            } else {
                // Insert
                const { error, data: newElevator } = await supabase.from('elevators').insert({
                    ...payload,
                    supervisor_name: supervisor,
                    company_id: profile.company_id,
                    empresa_contratada_id: null,
                    status: 'pre_instalacao' // Always start as pre to trigger default items
                }).select('id').single();
                
                if (!error && newElevator) {
                    count++;
                    const { data: syncRes } = await supabase.rpc('sync_elevator_phase_from_import', { p_elevator_id: newElevator.id, p_new_status: parsedStatus, p_user_id: user.user.id });
                    if(syncRes === 'MOVED_MONTAGEM') stats.movedMontagem++;
                    else if(syncRes === 'MOVED_AJUSTE') stats.movedAjuste++;
                    else if(syncRes === 'MOVED_ENTREGUE') stats.movedEntregue++;
                    else stats.kept++;
                } else console.error("Erro ao inserir:", error);
            }
        }
    }
    setLoading(false);
    setImportProgress({ current: 0, total: 0 });
    setImportModal(false);
    setImportReport({ count, stats });
    fetchElevators();
  } catch (err: any) {
    setLoading(false);
    setImportProgress({ current: 0, total: 0 });
    alert("Erro fatal ao processar o arquivo: " + err.message + "\nPor favor, garanta que atualizou a página (F5) e está enviando um arquivo Excel válido.");
  }
};

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Obras e Elevadores</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Monitoramento Inteligente</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="btn btn-secondary" onClick={handleClearDatabase} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4b4b', borderColor: 'rgba(255, 75, 75, 0.3)' }}>
            <Trash2 size={16} /> Limpar Base
          </button>
          <button className="btn btn-secondary" onClick={() => setImportModal(true)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadCloud size={16} /> Importar Planilha
          </button>
          <button className="btn-glow" onClick={handleCreateTestElevator} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Nova Obra (Teste)
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder="Buscar por ID do Equipamento, Empreendimento ou Contrato..." 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ paddingLeft: '48px', width: '100%', maxWidth: '600px', background: 'rgba(255,255,255,0.02)' }}
          />
        </div>
      </div>

      {(statusFilter || branchFilter || regionFilter || countryFilter || supervisorFilter) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', flexWrap: 'wrap' }}>
           <span style={{ color: 'var(--text-secondary)' }}>Filtros Ativos: </span>
           {statusFilter && <strong style={{ color: 'white', textTransform: 'uppercase' }}>Fase: {statusFilter === 'concluido' ? 'ENTREGUES' : statusFilter.replace('_', ' ')}</strong>}
           {branchFilter && <strong style={{ color: 'white' }}>Filial: {branchFilter}</strong>}
           {regionFilter && <strong style={{ color: 'white' }}>Região: {regionFilter}</strong>}
           {countryFilter && <strong style={{ color: 'white' }}>País: {countryFilter}</strong>}
           {supervisorFilter && <strong style={{ color: 'white' }}>Supervisor: {supervisorFilter}</strong>}

           <button 
             className="btn btn-secondary" 
             style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', marginLeft: 'auto' }}
             onClick={() => setSearchParams({})}
           >
             <XCircle size={14}/> Limpar Filtros
           </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
        {groupedElevators.map((group, idx) => {
          const styles = [
            { border: 'border-cyan', accent: 'var(--accent-cyan)' },
            { border: 'border-purple', accent: 'var(--accent-purple)' },
            { border: 'border-yellow', accent: 'var(--accent-yellow)' },
            { border: 'border-green', accent: 'var(--accent-green)' }
          ];
          const style = styles[idx % styles.length];
          return (
            <ProjectGroupCard key={idx} group={group} colorClass={style.border} accentColor={style.accent} onEdit={setEditModal} onDelete={handleDelete} onStartAjuste={handleStartAjuste} progressMap={progressMap} />
          );
        })}
      </div>

      {groupedElevators.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
          Nenhuma obra encontrada nesta fase.
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 10000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="neon-card border-cyan" style={{ width: '500px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>Editar Obra</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label>ID do Equipamento (Nome do Elevador)</label>
                <input type="text" className="input-field" value={editModal.name || ''} onChange={e => setEditModal({...editModal, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Nome do Empreendimento</label>
                <input type="text" className="input-field" value={editModal.project_name || ''} onChange={e => setEditModal({...editModal, project_name: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label>Contrato</label>
                <input type="text" className="input-field" value={editModal.contract_number || ''} onChange={e => setEditModal({...editModal, contract_number: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Filial</label>
                <input type="text" className="input-field" value={editModal.branch || ''} onChange={e => setEditModal({...editModal, branch: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label>País</label>
                <input type="text" className="input-field" placeholder="Ex: Brasil" value={editModal.country || 'Brasil'} onChange={e => setEditModal({...editModal, country: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Região / Estado</label>
                <input type="text" className="input-field" placeholder="Ex: Sudeste ou SP" value={editModal.region || ''} onChange={e => setEditModal({...editModal, region: e.target.value})} />
              </div>
            </div>

            <div className="input-group">
              <label>Empresa Contratada / Construtora</label>
              <input type="text" className="input-field" value={editModal.customer_company || ''} onChange={e => setEditModal({...editModal, customer_company: e.target.value})} />
            </div>

            <div className="input-group">
              <label>Endereço da Obra</label>
              <input type="text" className="input-field" value={editModal.address || ''} onChange={e => setEditModal({...editModal, address: e.target.value})} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label>Modelo do Equipamento</label>
                <input type="text" className="input-field" value={editModal.model || ''} onChange={e => setEditModal({...editModal, model: e.target.value})} />
              </div>
              <div className="input-group">
                <label>ID / Número de Série</label>
                <input type="text" className="input-field" value={editModal.equipment_id || ''} onChange={e => setEditModal({...editModal, equipment_id: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label>Qtd. Passageiros</label>
                <input type="text" className="input-field" value={editModal.passenger_capacity || ''} onChange={e => setEditModal({...editModal, passenger_capacity: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Velocidade (m/s)</label>
                <input type="text" className="input-field" value={editModal.speed || ''} onChange={e => setEditModal({...editModal, speed: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Número de Paradas</label>
                <input type="number" className="input-field" value={editModal.stops || ''} onChange={e => setEditModal({...editModal, stops: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label>Data de Início Real</label>
                <input type="date" className="input-field" value={editModal.start_date || ''} onChange={e => setEditModal({...editModal, start_date: e.target.value})} />
              </div>

              <div className="input-group">
                <label>Data Prevista</label>
                <input type="date" className="input-field" value={editModal.expected_end_date || ''} onChange={e => setEditModal({...editModal, expected_end_date: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label>Empresa Parceira</label>
                <select className="select-field" value={editModal.empresa_contratada_id || ''} onChange={e => setEditModal({...editModal, empresa_contratada_id: e.target.value})}>
                  <option value="">Próprio</option>
                  {companiesList.map(c => (
                    <option key={c.id} value={c.id}>{c.nome_fantasia}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Equipe</label>
                <input type="text" className="input-field" placeholder="Ex: Alpha" value={editModal.team_name || ''} onChange={e => setEditModal({...editModal, team_name: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Supervisor</label>
                <select className="select-field" value={editModal.supervisor_name || ''} onChange={e => setEditModal({...editModal, supervisor_name: e.target.value})}>
                  <option value="">Selecione ou digite no Excel...</option>
                  <optgroup label="Supervisores Próprios">
                    {usersList
                      .filter(u => ['supervisor', 'gerente_regional', 'coordenador_nacional', 'gestor_equipe'].includes(u.role))
                      .map(u => (
                        <option key={u.id} value={u.full_name}>{u.full_name} ({u.role.replace('_', ' ')})</option>
                      ))}
                  </optgroup>
                  {editModal.empresa_contratada_id && (
                    <optgroup label="Supervisores da Terceirizada">
                      {tecnicosList
                        .filter(t => t.empresa_id === editModal.empresa_contratada_id && t.funcao.toLowerCase().includes('supervisor'))
                        .map(t => (
                          <option key={t.id} value={t.nome}>{t.nome} (Terceirizado)</option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div className="input-group">
                <label>Mecânico / Técnico</label>
                <select className="select-field" value={editModal.mechanic_name || ''} onChange={e => {
                  const val = e.target.value;
                  if (editModal.empresa_contratada_id) {
                    const tecnico = tecnicosList.find(t => t.nome === val && t.empresa_id === editModal.empresa_contratada_id);
                    if (tecnico) {
                      setEditModal({
                        ...editModal, 
                        mechanic_name: val,
                        mestre_telefone: tecnico.telefone || editModal.mestre_telefone,
                        mestre_telegram: tecnico.telegram_id || editModal.mestre_telegram
                      });
                      return;
                    }
                  }
                  setEditModal({...editModal, mechanic_name: val});
                }}>
                  <option value="">Selecione ou digite no Excel...</option>
                  {editModal.empresa_contratada_id ? (
                    tecnicosList
                      .filter(t => t.empresa_id === editModal.empresa_contratada_id)
                      .map(t => (
                        <option key={t.id} value={t.nome}>{t.nome} ({t.funcao})</option>
                      ))
                  ) : (
                    usersList
                      .filter(u => !u.company_id)
                      .map(u => (
                        <option key={u.id} value={u.full_name}>{u.full_name} ({u.role.replace('_', ' ')})</option>
                      ))
                  )}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ margin: '0 0 16px 0', color: 'var(--accent-cyan)' }}>Dados do Cliente (Pré-Instalação)</h4>
              <div className="input-group" style={{ marginBottom: '16px' }}>
                <label>E-mails dos envolvidos (separados por vírgula)</label>
                <input type="text" className="input-field" placeholder="exemplo@obra.com, mestre@obra.com" value={editModal.client_emails || ''} onChange={e => setEditModal({...editModal, client_emails: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label>Mestre de Obras</label>
                  <input type="text" className="input-field" value={editModal.mestre_nome || ''} onChange={e => setEditModal({...editModal, mestre_nome: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Telefone / WhatsApp</label>
                  <input type="text" className="input-field" placeholder="Ex: 11999999999" value={editModal.mestre_telefone || ''} onChange={e => setEditModal({...editModal, mestre_telefone: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Telegram ID (Robô)</label>
                  <input type="text" className="input-field" placeholder="ID numérico" value={editModal.mestre_telegram || ''} onChange={e => setEditModal({...editModal, mestre_telegram: e.target.value})} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditModal(null)}>Cancelar</button>
              <button className="btn-glow" style={{ flex: 1 }} onClick={saveEdit}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {importReport && (
        <div className="modal-overlay" onClick={() => setImportReport(null)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', textAlign: 'center' }}>
            <h2>✅ Sincronização Concluída!</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Obras processadas: {importReport.count}</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px', textAlign: 'left' }}>
              <div className="neon-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.05)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#a78bfa' }}>Mantidas / Pré-Inst.</h4>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{importReport.stats.kept}</p>
              </div>
              <div className="neon-card border-cyan" style={{ padding: '16px', background: 'rgba(0,255,255,0.05)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-cyan)' }}>Movidas p/ Montagem</h4>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{importReport.stats.movedMontagem}</p>
              </div>
              <div className="neon-card border-yellow" style={{ padding: '16px', background: 'rgba(250, 204, 21, 0.05)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#facc15' }}>Movidas p/ Ajuste</h4>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{importReport.stats.movedAjuste}</p>
              </div>
              <div className="neon-card border-green" style={{ padding: '16px', background: 'rgba(52, 211, 153, 0.05)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#34d399' }}>Movidas p/ Entregues</h4>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{importReport.stats.movedEntregue}</p>
              </div>
            </div>

            <button className="btn-glow" style={{ marginTop: '24px', width: '100%' }} onClick={() => setImportReport(null)}>
              Fechar Relatório
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="neon-card border-cyan" style={{ width: '600px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <UploadCloud size={24} color="var(--accent-cyan)"/> Importar Obras (Excel/CSV)
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Para importar automaticamente, envie sua planilha Excel <strong>(.xlsx)</strong>. 
              O sistema é inteligente e vai <strong>procurar pelo nome da coluna</strong>. As colunas podem estar em qualquer ordem, desde que tenham um nome similar a:
            </p>
            
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontFamily: 'monospace', color: 'var(--accent-cyan)', fontSize: '0.8rem', overflowX: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span>• <strong>ID Elevador</strong> (coluna: elevador) - <em>Obrigatório</em></span>
              <span>• <strong>Empreendimento</strong> (coluna: cliente)</span>
              <span>• <strong>Endereço</strong> (colunas: endereço e cidade)</span>
              <span>• <strong>Especificações</strong> (linha, capacid., veloc.)</span>
              <span>• <strong>Expedição Prevista</strong> (colunas: expedição, exped. prevista)</span>
              <span>• <strong>Prev. Montagem</strong> (coluna: cc+cm) <em>*Opcional</em></span>
              <span>• <strong>Fase Inst.</strong> (Sincroniza obras e preenche % automaticamente)</span>
            </div>

            <div className="input-group">
              <label>Selecione o arquivo .xlsx ou .csv no seu PC:</label>
              <input type="file" accept=".csv, .xlsx" className="input-field" onChange={handleFileUpload} />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button 
                className="btn-primary" 
                onClick={() => setImportModal(false)}
                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
            
            {loading && (
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <p style={{ color: 'var(--accent-orange)', fontWeight: 'bold', marginBottom: '8px' }}>
                  Importando obras... {importProgress.current} de {importProgress.total}
                </p>
                <div style={{ background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    background: 'var(--accent-orange)', 
                    height: '100%', 
                    width: importProgress.total > 0 ? `${(importProgress.current / importProgress.total) * 100}%` : '0%',
                    transition: 'width 0.2s ease-in-out'
                  }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
