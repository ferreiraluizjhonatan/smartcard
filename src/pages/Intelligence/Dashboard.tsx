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
  const [loading, setLoading] = useState(true);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

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
      )}

      {/* AI Modal */}
      <AIChatModal 
        isOpen={isAIModalOpen} 
        onClose={() => setIsAIModalOpen(false)}
        contextData={{
           view: 'Intelligence Dashboard',
           top_performers: metrics.slice(0, 3).map(m => m.mechanic_name),
           at_risk: metrics.filter(m => m.operational_profile === 'Em Risco').map(m => m.mechanic_name),
           average_score: metrics.length > 0 ? Math.round(metrics.reduce((acc, m) => acc + m.reliability_score, 0) / metrics.length) : 0
        }}
      />
    </div>
  );
}
