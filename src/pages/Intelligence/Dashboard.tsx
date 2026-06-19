import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Bot, TrendingUp, AlertTriangle, CheckCircle, Activity, Award, Sparkles } from 'lucide-react';
import { AIChatModal } from '../../components/AIChatModal';

interface MechanicMetrics {
  mechanic_name: string;
  company_id: string;
  total_elevators: number;
  completed_elevators: number;
  avg_speed_days: number;
  avg_percentage: number;
  reliability_score: number;
  operational_profile: string;
}

export default function OperationalIntelligence() {
  const [metrics, setMetrics] = useState<MechanicMetrics[]>([]);
  const [scheduleMetrics, setScheduleMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  useEffect(() => {
    fetchMetrics();
    fetchScheduleMetrics();
  }, []);

  const fetchScheduleMetrics = async () => {
    try {
      // 1. Fetch Elevators
      const { data: elevators } = await supabase.from('elevators').select('id, model, stops');
      if (!elevators) return;

      // 2. Fetch completed checklists for Assembly and Adjustment
      const { data: assembly } = await supabase.from('assembly_checklists').select('elevator_id, created_at, updated_at, percentage').eq('percentage', 100);
      const { data: adjustment } = await supabase.from('adjustment_checklists').select('elevator_id, created_at, updated_at, percentage').eq('percentage', 100);

      // Group by Model + Stops
      const groups: Record<string, { model: string, stops: string, assemblyDays: number[], adjustmentDays: number[] }> = {};

      const getDays = (start: string, end: string) => {
         const diff = new Date(end).getTime() - new Date(start).getTime();
         return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24))); // Minimum 1 day
      };

      elevators.forEach(el => {
         const key = `${el.model || 'Padrão'}-${el.stops || 'N/A'}`;
         if (!groups[key]) {
            groups[key] = { model: el.model || 'Padrão', stops: el.stops || 'N/A', assemblyDays: [], adjustmentDays: [] };
         }

         const elAssembly = assembly?.filter(a => a.elevator_id === el.id) || [];
         const elAdjustment = adjustment?.filter(a => a.elevator_id === el.id) || [];

         if (elAssembly.length > 0) {
            // Get earliest created_at and latest updated_at for this elevator's assembly checklists
            const start = elAssembly.reduce((min, p) => p.created_at < min ? p.created_at : min, elAssembly[0].created_at);
            const end = elAssembly.reduce((max, p) => p.updated_at > max ? p.updated_at : max, elAssembly[0].updated_at);
            groups[key].assemblyDays.push(getDays(start, end));
         }

         if (elAdjustment.length > 0) {
            const start = elAdjustment.reduce((min, p) => p.created_at < min ? p.created_at : min, elAdjustment[0].created_at);
            const end = elAdjustment.reduce((max, p) => p.updated_at > max ? p.updated_at : max, elAdjustment[0].updated_at);
            groups[key].adjustmentDays.push(getDays(start, end));
         }
      });

      const finalMetrics = Object.values(groups).map(g => ({
         model: g.model,
         stops: g.stops,
         avgAssembly: g.assemblyDays.length > 0 ? Math.round(g.assemblyDays.reduce((a,b)=>a+b,0) / g.assemblyDays.length) : 0,
         avgAdjustment: g.adjustmentDays.length > 0 ? Math.round(g.adjustmentDays.reduce((a,b)=>a+b,0) / g.adjustmentDays.length) : 0,
         samples: Math.max(g.assemblyDays.length, g.adjustmentDays.length)
      })).filter(g => g.samples > 0).sort((a, b) => b.samples - a.samples);

      setScheduleMetrics(finalMetrics);
    } catch (e) {
      console.error("Error fetching schedule metrics", e);
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('vw_mechanic_metrics').select('*').order('reliability_score', { ascending: false });
    if (data) setMetrics(data);
    if (error) console.error("Error fetching metrics:", error);
    setLoading(false);
  };

  const getProfileColor = (profile: string) => {
    if (profile === 'Executor Rápido') return 'text-cyan border-cyan bg-cyan/10';
    if (profile === 'Especialista de Qualidade') return 'text-purple-400 border-purple-400 bg-purple-400/10';
    if (profile === 'Multiplicador') return 'text-green-400 border-green-400 bg-green-400/10';
    if (profile === 'Em Risco') return 'text-red-400 border-red-400 bg-red-400/10';
    return 'text-gray-400 border-gray-600 bg-gray-800/30';
  };

  const getProfileIcon = (profile: string) => {
    if (profile === 'Executor Rápido') return <TrendingUp size={16} />;
    if (profile === 'Especialista de Qualidade') return <Award size={16} />;
    if (profile === 'Em Risco') return <AlertTriangle size={16} />;
    return <Activity size={16} />;
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Inteligência Operacional</h1>
          <p className="text-gray-400">Análise de produtividade e perfis operacionais da equipe</p>
        </div>
        <button 
          onClick={() => setIsAIModalOpen(true)}
          className="group relative flex items-center gap-3 bg-[#0b0f19]/80 backdrop-blur-md border border-cyan/30 text-cyan px-6 py-3 rounded-xl font-bold hover:text-white hover:border-cyan hover:shadow-[0_0_30px_rgba(0,255,255,0.3)] transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan/20 to-purple-600/20 translate-x-[-100%] group-hover:translate-x-[0%] transition-transform duration-500"></div>
          <Sparkles size={20} className="relative z-10 animate-pulse" />
          <span className="relative z-10">Gemini Operacional</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center text-cyan py-12">Analisando dados operacionais...</div>
      ) : (
        <div className="space-y-6">
          {/* Cronograma Inteligente Section */}
          <div className="neon-card border-cyan/50 p-6">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="text-cyan" /> Cronograma Inteligente (Base Histórica)
            </h2>
            <p className="text-gray-400 text-sm mb-6">Média de dias reais por fase cruzando modelo e número de paradas (Pré-instalação ignorada na análise).</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-sm">
                    <th className="pb-3 pr-4 font-medium">Modelo</th>
                    <th className="pb-3 pr-4 font-medium">Paradas</th>
                    <th className="pb-3 pr-4 font-medium text-cyan">Média Montagem</th>
                    <th className="pb-3 pr-4 font-medium text-purple-400">Média Ajuste</th>
                    <th className="pb-3 font-medium">Elevadores Analisados</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleMetrics.map((sm, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 pr-4 text-white font-medium">{sm.model}</td>
                      <td className="py-4 pr-4 text-white">{sm.stops}</td>
                      <td className="py-4 pr-4">
                         <span className="bg-cyan/10 text-cyan px-3 py-1 rounded-full text-sm font-bold border border-cyan/20">
                           {sm.avgAssembly > 0 ? `${sm.avgAssembly} dias` : 'Sem dados'}
                         </span>
                      </td>
                      <td className="py-4 pr-4">
                         <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full text-sm font-bold border border-purple-500/20">
                           {sm.avgAdjustment > 0 ? `${sm.avgAdjustment} dias` : 'Sem dados'}
                         </span>
                      </td>
                      <td className="py-4 text-gray-400 text-sm">{sm.samples} unidades concluídas</td>
                    </tr>
                  ))}
                  {scheduleMetrics.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-500">Nenhum dado histórico de montagem concluída para gerar cronograma preditivo ainda.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="neon-card p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Award className="text-cyan" /> Ranking de Confiabilidade
              </h2>
              <div className="space-y-4">
                {metrics.map((m, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-cyan/20 text-cyan flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{m.mechanic_name}</h3>
                        <div className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${getProfileColor(m.operational_profile)}`}>
                          {getProfileIcon(m.operational_profile)}
                          {m.operational_profile}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-black text-cyan">{m.reliability_score}</div>
                      <div className="text-xs text-gray-500">Score de Confiabilidade</div>
                    </div>
                  </div>
                ))}
                {metrics.length === 0 && (
                   <div className="text-gray-500">Nenhum dado encontrado para análise.</div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="neon-card border-red-500/50 p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="text-red-400" /> Atenção Necessária
                </h2>
                <div className="space-y-3">
                  {metrics.filter(m => m.operational_profile === 'Em Risco').map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <span className="text-white font-medium">{m.mechanic_name}</span>
                      <span className="text-red-400 text-sm">Score: {m.reliability_score}</span>
                    </div>
                  ))}
                  {metrics.filter(m => m.operational_profile === 'Em Risco').length === 0 && (
                    <div className="text-green-400 text-sm flex items-center gap-2">
                      <CheckCircle size={16} /> Nenhuma equipe em risco operante!
                    </div>
                  )}
                </div>
              </div>

              <div className="neon-card p-6">
                <h2 className="text-xl font-bold text-white mb-4">Métricas Globais</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#1a1a1a] rounded-xl border border-white/5">
                     <div className="text-3xl font-bold text-cyan">
                       {metrics.length > 0 ? Math.round(metrics.reduce((acc, m) => acc + m.reliability_score, 0) / metrics.length) : 0}
                     </div>
                     <div className="text-sm text-gray-400">Score Médio Geral</div>
                  </div>
                  <div className="p-4 bg-[#1a1a1a] rounded-xl border border-white/5">
                     <div className="text-3xl font-bold text-purple-400">
                       {metrics.filter(m => m.reliability_score >= 80).length}
                     </div>
                     <div className="text-sm text-gray-400">Top Performers</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* AI Modal */}
      <AIChatModal 
        isOpen={isAIModalOpen} 
        onClose={() => setIsAIModalOpen(false)}
        contextData={{
           view: 'Intelligence Dashboard',
           top_performers: metrics.slice(0, 3).map(m => m.mechanic_name),
           at_risk: metrics.filter(m => m.operational_profile === 'Em Risco').map(m => m.mechanic_name),
           average_score: metrics.length > 0 ? Math.round(metrics.reduce((acc, m) => acc + m.reliability_score, 0) / metrics.length) : 0,
           historical_schedule_metrics: scheduleMetrics
        }}
      />
    </div>
  );
}
