import React, { useState, useEffect } from 'react';
import { X, Clock, User, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  elevatorId: string;
  mechanicName?: string;
}

export function LogsModal({ isOpen, onClose, elevatorId, mechanicName }: LogsModalProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  const fetchLogs = async () => {
    setLoading(true);
    
    // Buscar log de checklists (progresso)
    const { data: checklistLogs } = await supabase
      .from('checklist_progress_log')
      .select('*')
      .eq('elevator_id', elevatorId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Buscar histórico de mudança de fase
    const { data: historyLogs } = await supabase
      .from('elevator_history')
      .select('*, user_profiles(full_name)')
      .eq('elevator_id', elevatorId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Formatar os logs
    const formattedLogs = (checklistLogs || []).map(log => {
      let fase = 'Atividade';
      if (log.table_name === 'pre_installation_checklists') fase = 'Pré-Instalação';
      if (log.table_name === 'assembly_checklists') fase = 'Montagem';
      if (log.table_name === 'adjustment_checklists') fase = 'Ajustes';

      let acao = `Atualizou o avanço de ${log.old_percentage}% para ${log.percentage}%`;
      if (log.old_percentage === null || log.old_percentage === undefined) {
         acao = `Marcou a atividade com ${log.percentage}%`;
      }

      return {
        id: log.id,
        date: new Date(log.created_at),
        type: 'checklist',
        user: mechanicName || 'Mecânico',
        description: `Na fase de ${fase}: ${acao}`,
        icon: <Activity size={18} className="text-cyan" />,
        color: 'var(--accent-cyan)'
      };
    });

    // Adicionar logs de history
    (historyLogs || []).forEach(log => {
       const userName = log.user_profiles?.full_name || 'Admin';
       formattedLogs.push({
         id: log.id,
         date: new Date(log.created_at),
         type: 'phase',
         user: userName,
         description: `Mudança de fase: de ${log.old_status} para ${log.new_status}. ${log.notes || ''}`,
         icon: <Clock size={18} className="text-yellow-500" />,
         color: 'var(--accent-yellow)'
       });
    });

    // Ordenar do mais recente pro mais antigo
    formattedLogs.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    setLogs(formattedLogs);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111111] border border-yellow-500/30 rounded-2xl w-full max-w-2xl flex flex-col h-[80vh] shadow-[0_0_40px_rgba(234,179,8,0.1)] overflow-hidden">
        
        <div className="flex justify-between items-center p-4 border-b border-yellow-500/20 bg-[#161616]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Clock className="text-yellow-500 w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Histórico & Logs</h3>
              <p className="text-xs text-gray-400">Rastreamento de Atividades</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-[#111111] to-[#0a0a0a]">
          {loading ? (
             <div className="text-center text-gray-400">Carregando histórico...</div>
          ) : logs.length === 0 ? (
             <div className="text-center text-gray-500 py-10">Nenhum log registrado para esta obra ainda. (O registro automático começou agora)</div>
          ) : (
            <div className="relative border-l border-gray-800 ml-4 space-y-8">
              {logs.map((log) => (
                <div key={log.id} className="relative pl-6">
                  {/* Ponto na timeline */}
                  <div className="absolute -left-3 top-0 w-6 h-6 rounded-full flex items-center justify-center bg-[#111111] border border-gray-700">
                     <div style={{ color: log.color }}>
                       {log.icon}
                     </div>
                  </div>

                  <div className="bg-[#1a1a1a] border border-white/5 p-4 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-xs font-bold px-2 py-1 rounded bg-black/50 text-gray-300 flex items-center gap-2">
                         <User size={12} /> {log.user}
                       </span>
                       <span className="text-xs text-gray-500">
                         {log.date.toLocaleString('pt-BR')}
                       </span>
                    </div>
                    <p className="text-sm text-gray-300 m-0">
                      {log.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
