import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Clock, Users, Calendar, CheckCircle2, Award, Globe, MapPin, Building, ShieldCheck, Filter, ChevronDown, ChevronUp, ChevronRight, TrendingUp, Target, Briefcase, Bell, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useTenant } from '../contexts/TenantContext';
import { getTenantConfig } from '../config/tenantConfig';

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeTenantId } = useTenant();
  const [userTenantId, setUserTenantId] = useState<string | null>(null);
  const tenantConfig = getTenantConfig(activeTenantId || userTenantId);
  const [elevators, setElevators] = useState<any[]>([]);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [assemblyChecklists, setAssemblyChecklists] = useState<any[]>([]);
  const [preChecklists, setPreChecklists] = useState<any[]>([]);
  const [selectedForecastMonth, setSelectedForecastMonth] = useState<string | null>(null);
  const [forecastFilterMechanic, setForecastFilterMechanic] = useState('');
  const [forecastFilterObra, setForecastFilterObra] = useState('');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [empresasStats, setEmpresasStats] = useState({ total: 0, ativas: 0, inativas: 0, tecnicos: 0 });
  const [ticketsCount, setTicketsCount] = useState(0);
  
  // Filter States (Persist in localStorage)
  const [isFiltersOpen, setIsFiltersOpen] = useState(localStorage.getItem('dash_isFiltersOpen') === 'true');
  const [fCountry, setFCountry] = useState(localStorage.getItem('dash_fCountry') || 'Brasil');
  const [fRegion, setFRegion] = useState(localStorage.getItem('dash_fRegion') || '');
  const [fBranch, setFBranch] = useState(localStorage.getItem('dash_fBranch') || '');
  const [fSupervisor, setFSupervisor] = useState(localStorage.getItem('dash_fSupervisor') || '');
  const [fTeam, setFTeam] = useState(localStorage.getItem('dash_fTeam') || '');
  
  const [isForecastOpen, setIsForecastOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('dash_isFiltersOpen', isFiltersOpen.toString());
    localStorage.setItem('dash_fCountry', fCountry);
    localStorage.setItem('dash_fRegion', fRegion);
    localStorage.setItem('dash_fBranch', fBranch);
    localStorage.setItem('dash_fSupervisor', fSupervisor);
    localStorage.setItem('dash_fTeam', fTeam);
  }, [isFiltersOpen, fCountry, fRegion, fBranch, fSupervisor, fTeam]);

  const clearFilters = () => {
    setFCountry('Brasil');
    setFRegion('');
    setFBranch('');
    setFSupervisor('');
    setFTeam('');
  };


  useEffect(() => {
    fetchStats();
  }, [activeTenantId]);

  const fetchStats = async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      const { data: profile } = await supabase.from('user_profiles').select('company_id, tenant_id, role, branch_name, can_register_users').eq('id', user.user.id).single();
      if (profile) {
        setUserRole(profile.role);
        if (profile.tenant_id) setUserTenantId(profile.tenant_id);
        
        let query = supabase.from('elevators').select('*');
        
        if (activeTenantId) {
          query = query.eq('tenant_id', activeTenantId);
        }

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

        const { data: el } = await query;
        if (el) setElevators(el);
      }
    }
    
    // Fetch stats for Empresas Contratadas
    const { data: empData } = await supabase.from('empresas_contratadas').select('id, status');
    const { count: tecCount } = await supabase.from('tecnicos_empresas').select('*', { count: 'exact', head: true });
    
    if (empData) {
       setEmpresasStats({
           total: empData.length,
           ativas: empData.filter(e => e.status === 'Ativa').length,
           inativas: empData.filter(e => e.status !== 'Ativa').length,
           tecnicos: tecCount || 0
       });
    }

    // Fetch Forecasts
    const { data: forecastData } = await supabase.from('previsoes_entrega').select('*');
    if (forecastData) setForecasts(forecastData);

    // Fetch Tickets
    const { count: tCount } = await supabase.from('tickets').select('id', { count: 'exact', head: true }).neq('status', 'fechado');
    setTicketsCount(tCount || 0);

    // Fetch Assembly Checklists for real productivity calculation
    const { data: chkData } = await supabase.from('assembly_checklists').select('elevator_id, percentage');
    if (chkData) setAssemblyChecklists(chkData);

    const { data: preChkData } = await supabase.from('pre_installation_checklists').select('elevator_id, percentage');
    if (preChkData) setPreChecklists(preChkData);

    setLoading(false);
  };

  // Filter Data
  const filteredData = useMemo(() => {
    return elevators.filter(e => {
      if (fCountry && (e.country || 'Brasil') !== fCountry) return false;
      if (fRegion && e.region !== fRegion) return false;
      if (fBranch && e.branch !== fBranch) return false;
      if (fSupervisor && e.supervisor_name !== fSupervisor) return false;
      if (fTeam && e.team_name !== fTeam) return false;
      return true;
    });
  }, [elevators, fCountry, fRegion, fBranch, fSupervisor, fTeam]);

  // KPIs
  const stats = useMemo(() => {
    const prodScore = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let endingThisMonth = 0;
    
    filteredData.forEach(e => {
      if (e.status !== 'concluido' && e.expected_end_date) {
        const d = new Date(e.expected_end_date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          endingThisMonth++;
        }
      }
    });

    const montagemElevators = filteredData.filter(e => e.status === 'montagem');
    let totalMontagemPct = 0;
    montagemElevators.forEach(e => {
       const chks = assemblyChecklists.filter(c => c.elevator_id === e.id);
       if (chks.length > 0) {
          totalMontagemPct += chks.reduce((acc, c) => acc + c.percentage, 0) / chks.length;
       }
    });

    const uniqueSupervisors = new Set(filteredData.map(e => e.supervisor_name).filter(Boolean)).size;

    return {
      pre: filteredData.filter(e => e.status === 'pre_instalacao').length,
      montagem: montagemElevators.length,
      ajuste: filteredData.filter(e => e.status === 'ajuste').length,
      concluidos: filteredData.filter(e => e.status === 'concluido').length,
      total: filteredData.length,
      productivity: montagemElevators.length ? Math.round(totalMontagemPct / montagemElevators.length) : 0,
      endingThisMonth,
      teams: new Set(filteredData.map(e => e.team_name).filter(Boolean)).size || 1,
      companies: new Set(filteredData.map(e => e.branch).filter(Boolean)).size || 6,
      technicians: uniqueSupervisors * 2 || 8
    };
  }, [filteredData, assemblyChecklists]);

  // Unique Options for Filters (Hierarchical Cascading)
  const countries = ['Brasil', ...Array.from(new Set(elevators.map(e => e.country).filter(c => c && c !== 'Brasil')))];
  
  const regions = Array.from(new Set(elevators
    .filter(e => !fCountry || (e.country || 'Brasil') === fCountry)
    .map(e => e.region).filter(Boolean)));
    
  const branches = Array.from(new Set(elevators
    .filter(e => (!fCountry || (e.country || 'Brasil') === fCountry) && (!fRegion || e.region === fRegion))
    .map(e => e.branch).filter(Boolean)));
    
  const supervisors = Array.from(new Set(elevators
    .filter(e => (!fCountry || (e.country || 'Brasil') === fCountry) && (!fRegion || e.region === fRegion) && (!fBranch || e.branch === fBranch))
    .map(e => e.supervisor_name).filter(Boolean)));
    
  const teams = Array.from(new Set(elevators
    .filter(e => (!fCountry || (e.country || 'Brasil') === fCountry) && (!fRegion || e.region === fRegion) && (!fBranch || e.branch === fBranch) && (!fSupervisor || e.supervisor_name === fSupervisor))
    .map(e => e.team_name).filter(Boolean)));

  // Helpers
  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
    return Math.max(0, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));
  };

  const completedData = filteredData.filter(e => e.status === 'concluido' && e.real_end_date);

  // Chart 1: Entregas por mês
  const deliveriesByMonth = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const data = months.map(m => ({ name: m, Entregas: 0 }));
    completedData.forEach(e => {
      const date = new Date(e.real_end_date);
      if (!isNaN(date.getTime())) {
        const monthIdx = date.getMonth();
        if (monthIdx >= 0 && monthIdx <= 11) {
          data[monthIdx].Entregas += 1;
        }
      }
    });
    return data;
  }, [completedData]);

  // Chart 2: Produtividade por equipe (Top 5)
  const teamProductivity = useMemo(() => {
    const map: any = {};
    completedData.forEach(e => {
      const name = e.team_name || 'Sem Equipe';
      if (!map[name]) map[name] = { name, Obras: 0, DiasTotais: 0 };
      map[name].Obras += 1;
      map[name].DiasTotais += calculateDays(e.start_date, e.real_end_date);
    });
    return Object.values(map)
      .sort((a: any, b: any) => b.Obras - a.Obras)
      .slice(0, 5)
      .map((t: any) => ({ ...t, TempoMedio: Math.round(t.DiasTotais / t.Obras) }));
  }, [completedData]);

  // Chart 3: Forecast (Demanda x Mão de Obra)
  const capacityForecast = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const data = months.map((m, index) => ({ 
      name: m, 
      monthIndex: index,
      DemandaEntrando: 0, 
      MaoDeObraLiberada: 0,
      obrasEntrando: [] as any[],
      mecanicosLivres: [] as any[]
    }));
    
    const currentYear = new Date().getFullYear();
    
    filteredData.forEach(e => {
      const isConcluido = e.status === 'concluido';
      const hasMechanic = !!(e.mechanic_name || e.team_name);

      // Obras entrando (Demanda) -> data_prevista_montagem
      const entryDateStr = e.data_prevista_montagem || e.start_date;
      if (entryDateStr && !isConcluido && !hasMechanic) {
        const d = new Date(entryDateStr);
        if (!isNaN(d.getTime()) && d.getFullYear() === currentYear) {
          const monthIdx = d.getMonth();
          data[monthIdx].DemandaEntrando += 1;
          
          // IM = average of pre_installation_checklists for this elevator
          const chks = preChecklists.filter(c => c.elevator_id === e.id);
          const im = chks.length > 0 ? Math.round(chks.reduce((acc, c) => acc + c.percentage, 0) / chks.length) : 0;
          
          data[monthIdx].obrasEntrando.push({
            ...e,
            expectedDate: entryDateStr,
            im
          });
        }
      }
    });

    // Grouping mechanics to calculate actual Mão de Obra Liberada
    const mechanicsMap = new Map<string, any>();

    filteredData.forEach(e => {
      if (e.expected_end_date && e.status !== 'concluido') {
        const mechanicName = e.mechanic_name || e.team_name;
        if (!mechanicName) return;
        
        const d = new Date(e.expected_end_date);
        if (isNaN(d.getTime())) return;

        if (!mechanicsMap.has(mechanicName)) {
          mechanicsMap.set(mechanicName, {
            mechanicName,
            role: 'Técnico',
            latestDate: d,
            expectedDate: e.expected_end_date,
            allocations: []
          });
        }

        const mechanicData = mechanicsMap.get(mechanicName);
        mechanicData.allocations.push({
          id: e.id,
          name: e.name,
          project_name: e.project_name,
          expectedDate: e.expected_end_date
        });

        // Update to latest date
        if (d > mechanicData.latestDate) {
          mechanicData.latestDate = d;
          mechanicData.expectedDate = e.expected_end_date;
        }
      }
    });

    // Assign mechanics to their final release month
    Array.from(mechanicsMap.values()).forEach(m => {
      if (m.latestDate.getFullYear() === currentYear) {
        const monthIdx = m.latestDate.getMonth();
        data[monthIdx].MaoDeObraLiberada += 1;
        data[monthIdx].mecanicosLivres.push(m);
      }
    });
    return data;
  }, [filteredData, preChecklists]);

  const buildUrl = (base: string, status?: string) => {
    const params = new URLSearchParams();
    if(status) params.append('status', status);
    if(fCountry) params.append('country', fCountry);
    if(fRegion) params.append('region', fRegion);
    if(fBranch) params.append('branch', fBranch);
    if(fSupervisor) params.append('supervisor', fSupervisor);
    return `${base}?${params.toString()}`;
  };

  // Rankings
  const getRankings = (groupBy: 'branch' | 'supervisor_name') => {
    const map: any = {};
    completedData.forEach(e => {
      const name = e[groupBy] || 'Não Informado';
      if (!map[name]) map[name] = { count: 0, totalDays: 0 };
      map[name].count += 1;
      map[name].totalDays += calculateDays(e.start_date, e.real_end_date);
    });
    return Object.keys(map).map(key => ({
      name: key,
      count: map[key].count,
      avgDays: Math.round(map[key].totalDays / map[key].count)
    })).sort((a, b) => b.count - a.count).slice(0, 5); // Sort by most deliveries
  };

  // Forecast summary
  const forecastSummary = useMemo(() => {
    const currentMonthIdx = new Date().getMonth() + 1; // 1-12
    const currentYear = new Date().getFullYear();
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    const next1 = currentMonthIdx % 12 + 1;
    const next2 = (currentMonthIdx + 1) % 12 + 1;
    
    const summary = {
      month0Name: months[currentMonthIdx - 1],
      month0Count: 0,
      month1Name: months[next1 - 1],
      month1Count: 0,
      month2Name: months[next2 - 1],
      month2Count: 0,
      avgConfidence: 0
    };

    let totalProb = 0;
    
    forecasts.forEach(f => {
      if (f.mes_previsto === currentMonthIdx && f.ano_previsto === currentYear) summary.month0Count++;
      else if (f.mes_previsto === next1 && (f.ano_previsto === currentYear || currentMonthIdx === 12)) summary.month1Count++;
      else if (f.mes_previsto === next2 && (f.ano_previsto === currentYear || currentMonthIdx >= 11)) summary.month2Count++;
      
      totalProb += Number(f.probabilidade);
    });

    if (forecasts.length > 0) {
      summary.avgConfidence = Math.round(totalProb / forecasts.length);
    }

    return summary;
  }, [forecasts]);

  if (loading) return <div style={{ padding: '24px' }}>Carregando Painel Executivo...</div>;

  // PAINEL OPERACIONAL (Técnicos de Campo)
  if (userRole === 'ajustador' || userRole === 'montador' || userRole === 'pre_instalador') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '2rem', margin: '0 0 8px 0', background: 'linear-gradient(90deg, #fff, var(--accent-yellow))', WebkitBackgroundClip: 'text', color: 'transparent' }}>Painel Operacional (Ajuste)</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Acompanhamento de Obras da Filial</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          
          <div className="neon-card border-purple" style={{ cursor: 'pointer', padding: '24px' }} onClick={() => navigate(buildUrl('/elevators', 'pre_instalacao'))}>
            <div style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
              <CheckCircle2 size={18} color="var(--accent-purple)" /> Em Pré-Instalação
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total na fase:</div>
            <div style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: '1' }}>{stats.pre}</div>
          </div>

          <div className="neon-card border-cyan" style={{ cursor: 'pointer', padding: '24px' }} onClick={() => navigate(buildUrl('/elevators', 'montagem'))}>
            <div style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
              <Activity size={18} color="var(--accent-cyan)" /> Em Montagem
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total na fase:</div>
            <div style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: '1' }}>{stats.montagem}</div>
          </div>

          <div className="neon-card border-yellow" style={{ cursor: 'pointer', padding: '24px' }} onClick={() => navigate(buildUrl('/elevators', 'ajuste'))}>
            <div style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
              <Clock size={18} color="var(--accent-yellow)" /> Elevadores para Ajustes
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Aguardando sua equipe:</div>
            <div style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: '1' }}>{stats.ajuste}</div>
          </div>

          <div className="neon-card border-green" style={{ cursor: 'pointer', padding: '24px' }} onClick={() => navigate(buildUrl('/elevators', 'concluido'))}>
            <div style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
              <Award size={18} color="var(--accent-green)" /> Elevadores Entregues
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Obras finalizadas:</div>
            <div style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: '1', color: 'var(--accent-green)' }}>{stats.concluidos}</div>
          </div>

          <div className="neon-card border-red" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => navigate('/forecasts')}>
            <div style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
              <Target size={18} color="#ef4444" /> Previsões de Entrega
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Vencendo neste mês:</div>
            <div style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: '1', color: '#ef4444', marginBottom: '16px' }}>{stats.endingThisMonth}</div>
            
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Status Global: <span style={{ color: stats.endingThisMonth > 0 ? '#ef4444' : 'var(--accent-green)', fontWeight: 'bold' }}>
                {stats.endingThisMonth > 0 ? 'Atenção / Risco' : 'No Prazo'}
              </span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // EXECUTIVE VIEW
  return (
    <div>
      {tenantConfig.logoUrl ? (
        <div className="glass-panel" style={{ 
          position: 'relative', 
          width: '100%', 
          minHeight: '140px', 
          marginBottom: '32px', 
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '32px',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Fundo Desfocado da Logo */}
          <img 
            src={tenantConfig.logoUrl} 
            alt="" 
            style={{ 
              position: 'absolute', 
              top: 0, left: 0,
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              filter: 'blur(40px)',
              opacity: 0.5,
              transform: 'scale(1.5)',
              zIndex: 0
            }} 
          />
          {/* Overlay Escuro para dar contraste ao texto */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to right, rgba(10,15,30,0.9) 0%, rgba(10,15,30,0.4) 100%)', zIndex: 1 }} />
          
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <img 
                src={tenantConfig.logoUrl} 
                alt="Logo Empresa" 
                style={{ height: '70px', objectFit: 'contain' }} 
              />
            </div>
            <div>
              <h2 className="responsive-title" style={{ fontSize: '2.2rem', margin: '0 0 8px 0', color: '#ffffff', fontWeight: 'bold', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Dashboard Executivo Corporativo</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '1.1rem' }}>Monitoramento Global de Performance</p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h2 className="responsive-title" style={{ fontSize: '2rem', margin: '0 0 8px 0', background: 'linear-gradient(90deg, #fff, var(--accent-cyan))', WebkitBackgroundClip: 'text', color: 'transparent' }}>Dashboard Executivo Corporativo</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Monitoramento Global de Performance</p>
          </div>
        </div>
      )}

      {/* Advanced Filters Toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: isFiltersOpen ? '16px' : '32px' }}>
        <button 
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          style={{
            background: isFiltersOpen ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.02)',
            color: isFiltersOpen ? '#000' : 'var(--text-secondary)',
            border: `1px solid ${isFiltersOpen ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)'}`,
            padding: '8px 20px',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            transition: 'all 0.3s',
            boxShadow: isFiltersOpen ? '0 0 15px rgba(6, 182, 212, 0.3)' : 'none'
          }}
        >
          <Filter size={16} color={isFiltersOpen ? '#000' : 'var(--accent-cyan)'} /> 
          {isFiltersOpen ? 'Ocultar Filtros' : 'Filtros Executivos'}
          {!isFiltersOpen && (fCountry || fRegion || fBranch || fSupervisor || fTeam) && (
            <span style={{ 
              background: 'var(--accent-cyan)', 
              color: '#000', 
              borderRadius: '50%', 
              width: '20px', 
              height: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '0.75rem',
              marginLeft: '4px'
            }}>
              {[fCountry, fRegion, fBranch, fSupervisor, fTeam].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Advanced Filters */}
      {isFiltersOpen && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '32px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', borderTop: '2px solid var(--accent-cyan)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontWeight: 'bold', marginRight: '16px', flex: '1 1 100%' }}>
            <span>Refinar Resultados:</span>
            {(fCountry !== 'Brasil' || fRegion || fBranch || fSupervisor || fTeam) && (
              <button 
                onClick={clearFilters}
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', cursor: 'pointer', marginLeft: 'auto' }}
              >
                Limpar Filtros
              </button>
            )}
          </div>
          
          <div className="input-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}><Globe size={14}/> País</div>
            <select className="input-field" value={fCountry} onChange={e => setFCountry(e.target.value)}>
               <option value="">Global</option>
               {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}><MapPin size={14}/> Região</div>
            <select className="input-field" value={fRegion} onChange={e => { setFRegion(e.target.value); setFBranch(''); setFSupervisor(''); setFTeam(''); }}>
               <option value="">Todas</option>
               {regions.map(o => <option key={o as string} value={o as string}>{o as string}</option>)}
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}><Building size={14}/> Filial</div>
            <select className="input-field" value={fBranch} onChange={e => { setFBranch(e.target.value); setFSupervisor(''); setFTeam(''); }}>
               <option value="">Todas</option>
               {branches.map(o => <option key={o as string} value={o as string}>{o as string}</option>)}
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}><ShieldCheck size={14}/> Supervisor</div>
            <select className="input-field" value={fSupervisor} onChange={e => { setFSupervisor(e.target.value); setFTeam(''); }}>
               <option value="">Todos</option>
               {supervisors.map(o => <option key={o as string} value={o as string}>{o as string}</option>)}
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}><Users size={14}/> Equipe</div>
            <select className="input-field" value={fTeam} onChange={e => setFTeam(e.target.value)}>
               <option value="">Todas</option>
               {teams.map(o => <option key={o as string} value={o as string}>{o as string}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* KPI Indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Card 0: Em Pré-Instalação */}
        <div className="neon-card border-purple" style={{ cursor: 'pointer', padding: '24px' }} onClick={() => navigate(buildUrl('/elevators', 'pre_instalacao'))}>
          <div style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
            <CheckCircle2 size={18} color="var(--accent-purple)" /> Em Pré-Instalação
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Aguardando início:</div>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: '1' }}>{stats.pre}</div>
        </div>

        {/* Card 1: Elevadores em Montagem */}
        <div className="neon-card border-cyan" style={{ cursor: 'pointer', padding: '24px' }} onClick={() => navigate(buildUrl('/elevators', 'montagem'))}>
          <div style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
            <Activity size={18} color="var(--accent-cyan)" /> Elevadores em Montagem
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total em andamento:</div>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: '1' }}>{stats.montagem}</div>
        </div>

        {/* Card 2: Elevadores para Ajustes */}
        <div className="neon-card border-yellow" style={{ cursor: 'pointer', padding: '24px' }} onClick={() => navigate(buildUrl('/elevators', 'ajuste'))}>
          <div style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
            <Clock size={18} color="var(--accent-yellow)" /> Elevadores para Ajustes
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Em ajuste:</div>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: '1' }}>{stats.ajuste}</div>
        </div>

        {/* Card 3: Curvas de Evolução */}
        <div className="neon-card border-purple" style={{ padding: '24px' }}>
          <div style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
            <TrendingUp size={18} color="var(--accent-purple)" /> Curvas de Evolução
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Índice de Produtividade:</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
            <div style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: '1' }}>{stats.productivity}%</div>
            <div style={{ backgroundColor: 'rgba(52, 199, 89, 0.2)', color: 'var(--accent-green)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>▲ {stats.productivity > 0 ? stats.productivity + 5 : 0}%</div>
          </div>
        </div>

        {/* Card 4: Elevadores Entregues */}
        <div 
          className="neon-card border-green" 
          style={{ padding: '24px', cursor: 'pointer' }}
          onClick={() => navigate(buildUrl('/elevators', 'concluido'))}
        >
          <div style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
            <Award size={18} color="var(--accent-green)" /> Elevadores Entregues
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total de obras finalizadas:</div>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: '1', color: 'var(--accent-green)', marginBottom: '16px' }}>{stats.concluidos}</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
             Vencem neste mês: <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{stats.endingThisMonth}</span>
          </div>
        </div>

        {/* Card 5: Previsões (IA) */}
        <div 
          className="neon-card border-green" 
          style={{ padding: '24px', cursor: 'pointer' }}
          onClick={() => navigate('/forecasts')}
        >
          <div style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
            <TrendingUp size={18} color="var(--accent-green)" /> Previsões de Entrega
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Estimativas baseadas em produtividade</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff' }}>
              <span>{forecastSummary.month0Name}:</span> <strong>{forecastSummary.month0Count} Obras</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff' }}>
              <span>{forecastSummary.month1Name}:</span> <strong>{forecastSummary.month1Count} Obras</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff' }}>
              <span>{forecastSummary.month2Name}:</span> <strong>{forecastSummary.month2Count} Obras</strong>
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Confiança Média:</span>
            <span style={{ fontWeight: 'bold', color: 'var(--accent-cyan)', fontSize: '1.2rem' }}>{forecastSummary.avgConfidence}%</span>
          </div>
        </div>

        {/* Card 5: Equipes Fixas & Técnicos */}
        <div className="neon-card border-green" style={{ padding: '24px' }}>
          <div style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
            <Users size={18} color="var(--accent-purple)" /> Equipes Fixas & Técnicos
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total de Equipes:</div>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: '1', color: 'var(--accent-green)' }}>{stats.teams}</div>
        </div>

        {/* Card 6: Empresas Contratadas */}
        <div 
          className="neon-card border-yellow" 
          style={{ padding: '24px', cursor: 'pointer' }}
          onClick={() => navigate('/empresas-contratadas')}
        >
          <div style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
            <Briefcase size={18} color="#94a3b8" /> Empresas Contratadas
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total de Empresas:</div>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', lineHeight: '1', color: 'var(--accent-yellow)' }}>{empresasStats.total}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Técnicos:</div>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', lineHeight: '1', color: '#fff' }}>{empresasStats.tecnicos}</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <div>Ativas: <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>{empresasStats.ativas}</span></div>
              <div>Inativas: <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{empresasStats.inativas}</span></div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); navigate('/intelligence'); }}
              className="btn-glow"
              style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={14} /> Inteligência Operacional
            </button>
          </div>
        </div>
      </div>

      {/* Forecast Chart (Full Width) */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => setIsForecastOpen(!isForecastOpen)}
        >
          <h3 style={{ margin: 0, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} /> Forecast de Capacidade: Demanda de Obras vs Liberação de Mão de Obra (Ano Atual)
          </h3>
          <div style={{ color: 'var(--text-secondary)' }}>
            {isForecastOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
        {isForecastOpen && (
          <div style={{ marginTop: '24px' }}>
            <div style={{ height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={capacityForecast} onClick={(data) => {
                  if (data && data.activeLabel) {
                    setSelectedForecastMonth(data.activeLabel === selectedForecastMonth ? null : data.activeLabel as string);
                  }
                }} style={{ cursor: 'pointer' }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" allowDecimals={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: 'rgba(10,14,23,0.9)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar name="Obras Entrando (Novas)" dataKey="DemandaEntrando" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
                  <Bar name="Mão de Obra Livre (Términos)" dataKey="MaoDeObraLiberada" fill="var(--accent-yellow)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Interactive Click Details */}
            {selectedForecastMonth && (() => {
              const monthData = capacityForecast.find(m => m.name === selectedForecastMonth);
              if (!monthData) return null;
              
              const filteredObras = monthData.obrasEntrando.filter(o => o.name.toLowerCase().includes(forecastFilterObra.toLowerCase()));
              const filteredMechanics = monthData.mecanicosLivres.filter(m => m.mechanicName.toLowerCase().includes(forecastFilterMechanic.toLowerCase()));
              
              return (
                <div style={{ marginTop: '32px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '32px' }}>
                  <div className="responsive-flex-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
                    <h3 className="responsive-title" style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>Detalhamento: {selectedForecastMonth}</h3>
                    <div className="responsive-flex-wrap" style={{ display: 'flex', gap: '16px', flex: '1 1 auto', justifyContent: 'flex-end' }}>
                      <input 
                        type="text" 
                        placeholder="Pesquisar Obra..." 
                        className="input-field responsive-input" 
                        value={forecastFilterObra}
                        onChange={e => setForecastFilterObra(e.target.value)}
                        style={{ width: '200px', margin: 0 }}
                      />
                      <input 
                        type="text" 
                        placeholder="Pesquisar Mecânico..." 
                        className="input-field responsive-input" 
                        value={forecastFilterMechanic}
                        onChange={e => setForecastFilterMechanic(e.target.value)}
                        style={{ width: '200px', margin: 0 }}
                      />
                    </div>
                  </div>
                  
                  <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    {/* Left: Mecânicos Livres */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h4 style={{ color: 'var(--accent-yellow)', margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>Mecânicos que Ficarão Livres ({filteredMechanics.length})</h4>
                      {filteredMechanics.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Nenhum mecânico previsto para liberação.</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {filteredMechanics.map((m, idx) => (
                            <div key={idx} style={{ background: 'rgba(234, 179, 8, 0.05)', padding: '12px', borderRadius: '4px', borderLeft: '3px solid var(--accent-yellow)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <strong 
                                  style={{ color: '#fff', cursor: 'help' }}
                                  title={`Alocado atualmente em ${m.allocations?.length || 1} obra(s):\n${m.allocations?.map((a: any) => `- ${a.name}${a.project_name ? ' (' + a.project_name + ')' : ''} [Liberação: ${new Date(a.expectedDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}]`).join('\n')}`}
                                >
                                  {m.mechanicName}
                                </strong>
                                <span style={{ color: 'var(--accent-yellow)', fontSize: '0.85rem' }}>{new Date(m.expectedDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Função: {m.role} <br/>
                                Obra(s) Atual(is): {m.allocations?.map((a: any, i: number) => (
                                  <span key={i}>
                                    <strong style={{ color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(`/elevators/${a.id}/hub`)}>{a.name}{a.project_name ? ` - ${a.project_name}` : ''}</strong>
                                    {i < m.allocations.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Right: Obras Entrando */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h4 style={{ color: 'var(--accent-cyan)', margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>Obras Entrando ({filteredObras.length})</h4>
                      {filteredObras.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Nenhuma obra prevista para entrar.</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {filteredObras.map((o, idx) => (
                            <div key={idx} style={{ background: 'rgba(6, 182, 212, 0.05)', padding: '12px', borderRadius: '4px', borderLeft: '3px solid var(--accent-cyan)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <strong 
                                  style={{ color: '#fff', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}
                                  onClick={() => navigate(`/elevators/${o.id}/hub`)}
                                >
                                  {o.name}
                                  {o.project_name && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>- {o.project_name}</span>}
                                  <ChevronRight size={14} style={{ color: 'var(--accent-cyan)' }} />
                                </strong>
                                <span style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>{new Date(o.expectedDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Status: <span style={{ textTransform: 'uppercase' }}>{o.status.replace('_', ' ')}</span> <br/>
                                Índice de Montabilidade (IM): <strong style={{ color: o.im >= 80 ? 'var(--accent-green)' : o.im >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>{o.im}%</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Cruzamento Inteligente */}
                  {(filteredObras.length > 0 || filteredMechanics.length > 0) && (
                    <div style={{ marginTop: '24px', background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h4 style={{ color: 'var(--accent-purple)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={18} /> Sugestão de Alocação Inteligente
                      </h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>Mapeamento automático: Cruzando obras que vão iniciar com mecânicos que ficarão livres no mês.</p>
                      
                      {filteredObras.length > 0 && filteredMechanics.length > 0 ? (
                        <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                          {filteredObras.map((obra, idx) => {
                            const mechanic = filteredMechanics[idx % filteredMechanics.length];
                            return (
                              <div key={idx} className="responsive-flex" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '6px' }}>
                                <div 
                                  style={{ flex: 1, color: '#fff', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}
                                  onClick={() => navigate(`/elevators/${obra.id}/hub`)}
                                >
                                  {obra.name}
                                  {obra.project_name && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>- {obra.project_name}</span>}
                                  <ChevronRight size={14} style={{ color: 'var(--accent-purple)' }} />
                                </div>
                                <div style={{ color: 'var(--accent-purple)' }}><ChevronRight size={20} /></div>
                                <div 
                                  style={{ flex: 1, color: 'var(--accent-yellow)', fontWeight: 'bold', cursor: 'help' }}
                                  title={`Alocado atualmente em ${mechanic.allocations?.length || 1} obra(s):\n${mechanic.allocations?.map((a: any) => `- ${a.name}${a.project_name ? ' (' + a.project_name + ')' : ''} [Liberação: ${new Date(a.expectedDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}]`).join('\n')}`}
                                >
                                  {mechanic.mechanicName}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p style={{ color: 'var(--text-secondary)' }}>Faltam obras ou mecânicos para gerar uma sugestão completa de cruzamento.</p>
                      )}
                    </div>
                  )}
                  
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
        
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} /> Entregas por Mês
          </h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deliveriesByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(10,14,23,0.9)', border: '1px solid var(--accent-cyan)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--accent-cyan)' }}
                />
                <Bar dataKey="Entregas" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Activity size={18} /> Produtividade por Equipe (Top 5)
          </h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={teamProductivity} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{fontSize: 10}} interval={0} />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(10,14,23,0.9)', border: '1px solid var(--accent-purple)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--accent-purple)' }}
                />
                <Legend />
                <Line type="monotone" name="Obras Entregues" dataKey="Obras" stroke="var(--accent-purple)" strokeWidth={3} dot={{r: 5}} />
                <Line type="monotone" name="Dias / Obra" dataKey="TempoMedio" stroke="var(--accent-yellow)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Rankings Section */}
      <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)' }}>
              <Building size={20}/> Ranking de Filiais (Top Entregas)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getRankings('branch').map((item, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px',
                  borderLeft: idx === 0 ? '4px solid var(--accent-cyan)' : '4px solid transparent'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {idx === 0 ? <Award size={24} color="var(--accent-cyan)"/> : <div style={{ width: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>{idx + 1}º</div>}
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{item.count} Entregues</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tempo Médio: {item.avgDays}d</div>
                    </div>
                </div>
              ))}
              {getRankings('branch').length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Nenhum dado de entrega no período.</p>}
            </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-purple)' }}>
              <ShieldCheck size={20}/> Ranking de Supervisores (Top Entregas)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getRankings('supervisor_name').map((item, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px',
                  borderLeft: idx === 0 ? '4px solid var(--accent-purple)' : '4px solid transparent'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {idx === 0 ? <Award size={24} color="var(--accent-purple)"/> : <div style={{ width: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>{idx + 1}º</div>}
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--accent-purple)', fontWeight: 'bold' }}>{item.count} Entregues</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tempo Médio: {item.avgDays}d</div>
                    </div>
                </div>
              ))}
              {getRankings('supervisor_name').length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Nenhum dado de entrega no período.</p>}
            </div>
        </div>

      </div>

    </div>
  );
}
