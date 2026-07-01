import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, FileText, CheckCircle2, AlertTriangle, Camera } from 'lucide-react';
import { renderItemName } from './Checklist';
import { getTenantConfig } from '../../config/tenantConfig';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export default function ElevatorReport() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [elevator, setElevator] = useState<any>(null);
  const tenantConfig = getTenantConfig(elevator?.tenant_id);
  
  // Dados brutos
  const [preItems, setPreItems] = useState<any[]>([]);
  const [assemblyItems, setAssemblyItems] = useState<any[]>([]);
  const [adjustmentItems, setAdjustmentItems] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  // Filtros
  const [reportType, setReportType] = useState('completo'); // 'completo' | 'resumido'
  const [phaseFilter, setPhaseFilter] = useState('todas'); // 'todas' | 'pre' | 'montagem_ajuste'

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const { data: el } = await supabase.from('elevators').select('*').eq('id', id).single();
    if (el) setElevator(el);

    const [preRes, asmRes, adjRes, tckRes] = await Promise.all([
      supabase.from('pre_installation_checklists').select('*').eq('elevator_id', id).order('id'),
      supabase.from('assembly_checklists').select('*').eq('elevator_id', id).order('id'),
      supabase.from('adjustment_checklists').select('*').eq('elevator_id', id).order('id'),
      supabase.from('tickets').select('*').eq('elevator_id', id).order('created_at', { ascending: true })
    ]);
    const sortByNumber = (list: any[]) => list.sort((a, b) => {
      const numA = parseInt(a.item_name.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.item_name.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });

    if (preRes.data) setPreItems(sortByNumber(preRes.data));
    if (asmRes.data) setAssemblyItems(sortByNumber(asmRes.data));
    if (adjRes.data) setAdjustmentItems(sortByNumber(adjRes.data));
    if (tckRes.data) setTickets(tckRes.data);

    setLoading(false);
  };

  const calculatePct = (items: any[]) => {
    if(!items || items.length === 0) return 0;
    const sum = items.reduce((acc, curr) => acc + curr.percentage, 0);
    return Math.round(sum / items.length);
  };

  const renderChecklistPhase = (title: string, items: any[]) => {
    const pct = calculatePct(items);
    
    // Filtrar apenas itens com fotos ou anotações/pendências/tickets que merecem ir pro relatório
    const relevantItems = items.filter(i => 
      (i.photos_urls && i.photos_urls.length > 0) || 
      (reportType === 'completo' && (i.notes || i.pending_items)) ||
      (tickets.some(t => t.title === i.item_name || t.title === `Problema: ${i.item_name}`))
    );

    if (relevantItems.length === 0 && pct === 0) return null;

    return (
      <div style={{ marginBottom: '32px' }}>
        <div style={{ borderBottom: '2px solid #ccc', paddingBottom: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, color: '#333' }}>{title}</h3>
          <h3 style={{ margin: 0, color: '#333' }}>Concluído: {pct}%</h3>
        </div>

        {relevantItems.map((item, idx) => (
          <div key={idx} style={{ marginBottom: '24px', padding: '16px', border: '1px solid #eee', borderRadius: '8px', background: '#fafafa' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#444' }}>
              {item.percentage === 100 ? <CheckCircle2 size={16} color="green" style={{ display: 'inline', marginRight: '4px' }}/> : null}
              {renderItemName(item.item_name)} <span style={{ fontWeight: 'normal', color: '#666', fontSize: '0.9em' }}>({item.percentage}%)</span>
            </h4>

            {reportType === 'completo' && item.notes && (
              <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#555' }}><strong>Anotação:</strong> {item.notes}</p>
            )}
            
            {reportType === 'completo' && item.pending_items && (
              <p className="text-red-print" style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'red' }}><strong>Pendência:</strong> {item.pending_items}</p>
            )}

            {item.photos_urls && item.photos_urls.length > 0 && (
              <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Camera size={14}/> Registros Fotográficos
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {item.photos_urls.map((url: string, i: number) => (
                    <img key={i} src={url} alt={`Evidência ${i}`} style={{ width: '200px', height: '150px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }} />
                  ))}
                </div>
              </div>
            )}

            {tickets.filter(t => t.title === item.item_name || t.title === `Problema: ${item.item_name}`).map(t => (
              <p key={t.id} style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: t.status === 'fechado' ? 'green' : 'red' }}>
                 <strong>{t.status === 'fechado' ? '✅ Pendência Resolvida' : '⚠️ Pendência em Aberto'}:</strong> {t.description}
                 <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '8px' }}>
                   (Criado: {new Date(t.created_at).toLocaleDateString('pt-BR')}{t.status === 'fechado' && t.closed_at ? ` | Fechado: ${new Date(t.closed_at).toLocaleDateString('pt-BR')}` : ''})
                 </span>
              </p>
            ))}
          </div>
        ))}
        {relevantItems.length === 0 && <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem' }}>Nenhum registro fotográfico ou anotação nesta fase.</p>}
      </div>
    );
  };

  const handleGeneratePDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;
    
    const printBtn = document.getElementById('pdf-btn');
    if (printBtn) printBtn.style.display = 'none';

    try {
      // @ts-ignore
      await html2pdf().set({
        margin:       10,
        filename:     `Relatorio_${elevator?.name || 'Obra'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(element).save();
    } finally {
      if (printBtn) printBtn.style.display = 'flex';
    }
  };

  if (loading) return <div style={{ padding: '24px' }}>Gerando Relatório...</div>;

  return (
    <div style={{ background: '#fff', color: '#000', minHeight: '100vh' }}>
      
      {/* Controles de Filtro (Escondidos na impressão) */}
      <div className="no-print" style={{ background: 'var(--bg-card)', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', flex: '1 1 auto' }}>
          <button className="btn btn-secondary hide-print" onClick={() => navigate(-1)} style={{ padding: '8px' }}>
            <ArrowLeft size={20} />
          </button>
          <h3 style={{ margin: 0, color: 'white', whiteSpace: 'nowrap' }}>Filtros do Relatório</h3>
          
          <select className="select-field" style={{ minWidth: '200px', flex: '1 1 auto' }} value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="completo">Relatório Completo (C/ Ocorrências)</option>
            <option value="resumido">Relatório Cliente (Só Fotos e Status)</option>
          </select>

          <select className="select-field" style={{ minWidth: '160px', flex: '1 1 auto' }} value={phaseFilter} onChange={e => setPhaseFilter(e.target.value)}>
            <option value="todas">Todas as Fases</option>
            <option value="pre">Só Pré-Instalação</option>
            <option value="montagem_ajuste">Montagem e Ajuste</option>
          </select>
        </div>

        <button id="pdf-btn" className="btn-glow border-cyan" onClick={handleGeneratePDF} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '1rem', fontWeight: 'bold' }}>
          <Printer size={18} /> IMPRIMIR PDF
        </button>
      </div>

      {/* Conteúdo do Relatório Formato A4 */}
      <div id="report-content" style={{ maxWidth: '900px', margin: '0 auto', padding: '40px', background: 'white' }}>
        
        {/* Cabeçalho */}
        <div style={{ marginBottom: '32px' }}>
          {tenantConfig.logoUrl ? (
            <div style={{ 
              position: 'relative', 
              width: '100%', 
              height: '80px', 
              marginBottom: '24px', 
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingLeft: '24px',
              borderRadius: '4px'
            }}>
              {/* Fundo Desfocado */}
              <img 
                src={tenantConfig.logoUrl} 
                alt="" 
                style={{ 
                  position: 'absolute', 
                  top: 0, left: 0,
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover', 
                  filter: 'blur(25px)',
                  opacity: 0.8,
                  transform: 'scale(1.5)'
                }} 
              />
              {/* Logo Proporcional */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center' }}>
                <img 
                  src={tenantConfig.logoUrl} 
                  alt="Logo" 
                  style={{ height: '50px', objectFit: 'contain' }} 
                />
              </div>
            </div>
          ) : null}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #00d2ff', paddingBottom: '16px' }}>
            <div>
              <h1 style={{ color: '#000', margin: '0 0 8px 0', fontSize: '2.2rem' }}>Relatório de Inspeção Técnica</h1>
              <p style={{ margin: 0, color: '#555', fontSize: '1.1rem' }}>Smartcard - Gestão Ágil de Elevadores NI</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>Data de Emissão:</p>
              <p style={{ margin: 0, color: '#666' }}>{new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </div>

        {/* Informações da Obra */}
        <div style={{ background: '#f5f7fa', padding: '20px', borderRadius: '8px', marginBottom: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '0.85rem' }}>Obra / Edifício</p>
            <h2 style={{ margin: '0 0 16px 0', color: '#222', fontSize: '1.4rem' }}>{elevator?.name} {elevator?.project_name ? `- ${elevator.project_name}` : ''}</h2>

            <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '0.85rem' }}>Endereço</p>
            <p style={{ margin: '0 0 16px 0', fontWeight: '500' }}>{elevator?.address || 'Não Informado'}</p>

            <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '0.85rem' }}>Período Contratual Global</p>
            <p style={{ margin: 0, fontWeight: '500' }}>
              {elevator?.start_date ? new Date(elevator.start_date).toLocaleDateString() : '--'} até {elevator?.expected_end_date ? new Date(elevator.expected_end_date).toLocaleDateString() : '--'}
            </p>

            <p style={{ margin: '16px 0 4px 0', color: '#666', fontSize: '0.85rem' }}>Datas Reais e Marcos Físicos</p>
            <div style={{ background: '#fff', border: '1px solid #ddd', padding: '12px', borderRadius: '6px', fontSize: '0.9rem' }}>
               <p style={{ margin: '0 0 6px 0' }}><strong>Conclusão Pré-Instalação:</strong> {elevator?.pre_install_end_date ? new Date(elevator.pre_install_end_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '--'}</p>
               <p style={{ margin: 0 }}><strong>Início da Montagem:</strong> {elevator?.assembly_start_date ? new Date(elevator.assembly_start_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '--'}</p>
            </div>
          </div>
          
          <div>
            <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '0.85rem' }}>Construtora / Cliente</p>
            <h2 style={{ margin: '0 0 16px 0', color: '#222', fontSize: '1.4rem' }}>{elevator?.customer_company || 'Não Informado'}</h2>

            <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '0.85rem' }}>Dados Comerciais</p>
            <div style={{ background: '#fff', border: '1px solid #ddd', padding: '12px', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 6px 0' }}><strong>Contrato:</strong> {elevator?.contract_number || '-'}</p>
              <p style={{ margin: 0 }}><strong>Filial:</strong> {elevator?.branch || '-'}</p>
            </div>

            <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '0.85rem' }}>Dados do Equipamento</p>
            <div style={{ background: '#fff', border: '1px solid #ddd', padding: '12px', borderRadius: '6px', fontSize: '0.9rem' }}>
              <p style={{ margin: '0 0 6px 0' }}><strong>ID / Número de Série:</strong> {elevator?.equipment_id || '-'}</p>
              <p style={{ margin: '0 0 6px 0' }}><strong>Modelo:</strong> {elevator?.model || '-'}</p>
              <p style={{ margin: '0 0 6px 0' }}><strong>Capacidade:</strong> {elevator?.passenger_capacity || '-'}</p>
              <p style={{ margin: '0 0 6px 0' }}><strong>Velocidade:</strong> {elevator?.speed || '-'}</p>
              <p style={{ margin: 0 }}><strong>Paradas:</strong> {elevator?.stops || '-'}</p>
            </div>
          </div>
        </div>

        {/* Renderização das Fases */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ color: '#00d2ff', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #00d2ff', paddingBottom: '8px', marginBottom: '24px' }}>
            <FileText size={24} /> Relatório Fotográfico das Fases
          </h2>

          {(phaseFilter === 'todas' || phaseFilter === 'pre') && renderChecklistPhase('Fase: Pré-Instalação', preItems)}
          {(phaseFilter === 'todas' || phaseFilter === 'montagem_ajuste') && renderChecklistPhase('Fase: Montagem Mecânica', assemblyItems)}
          {(phaseFilter === 'todas' || phaseFilter === 'montagem_ajuste') && renderChecklistPhase('Fase: Ajuste e Partida', adjustmentItems)}
        </div>

        {/* Rodapé */}
        <div style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #ccc', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
          <p>Relatório gerado digitalmente pelo sistema Smartcard.</p>
        </div>

      </div>
    </div>
  );
}
