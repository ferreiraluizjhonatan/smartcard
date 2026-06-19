import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextData: any;
  elevatorId?: string;
}

export function AIChatModal({ isOpen, onClose, contextData, elevatorId }: AIChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { id: '1', role: 'assistant', content: 'Olá! Sou seu **Assistente de Inteligência Operacional**. Analisei o contexto da obra e da equipe. Como posso te apoiar com essas informações hoje?' }
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('https://jmwbjvogmslpftkxsgyl.supabase.co/functions/v1/ai-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          prompt: userMsg.content,
          contextData,
          elevator_id: elevatorId
        })
      });

      if (!response.ok) throw new Error('Falha na comunicação com a IA');

      const result = await response.json();
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: result.response || "A inteligência não retornou resposta."
      }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Desculpe, ocorreu um erro de conexão com o servidor de Inteligência. Detalhes: ${error.message}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 transition-all duration-500">
      <div className="relative w-full max-w-3xl flex flex-col h-[75vh] sm:h-[80vh] rounded-[2.5rem] bg-[#0f172a]/40 backdrop-blur-2xl border-[1.5px] border-cyan-400/40 shadow-[0_0_80px_rgba(34,211,238,0.15)] overflow-hidden">
        
        {/* Glow Effects inside Modal */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 blur-[120px] pointer-events-none"></div>

        <div className="flex justify-between items-center px-8 py-6 z-10">
          <div className="flex items-center gap-3">
            <Sparkles size={20} className="text-cyan-400" />
            <h3 className="font-bold text-lg tracking-widest text-white/90">GEMINI ASSISTANT</h3>
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)] ml-2"></div>
          </div>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 z-10 scrollbar-hide">
          {messages.map(msg => (
            <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="flex flex-col gap-1 max-w-[85%]">
                <div className={`p-5 rounded-3xl text-[15px] leading-relaxed shadow-lg backdrop-blur-md ${
                  msg.role === 'user' 
                    ? 'bg-[#0f172a]/60 border-[1.5px] border-cyan-400/50 text-cyan-50 rounded-br-sm' 
                    : 'bg-[#0f172a]/60 border-[1.5px] border-purple-500/40 text-purple-50 rounded-bl-sm'
                }`}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <div className="prose-custom">
                      <ReactMarkdown
                        components={{
                          strong: ({node, ...props}) => <strong className="text-white font-bold" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-xl font-bold text-white mt-4 mb-2" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg font-bold text-white mt-3 mb-2" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-md font-bold text-cyan-300 mt-2 mb-1" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1 text-white/80" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 space-y-1 text-white/80" {...props} />,
                          li: ({node, ...props}) => <li className="marker:text-cyan-400" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0 text-white/90" {...props} />
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                <span className={`text-[11px] text-white/40 font-medium px-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.role === 'user' ? 'Você' : 'Gemini AI'}
                </span>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex w-full justify-start animate-pulse">
               <div className="bg-[#0f172a]/60 border-[1.5px] border-purple-500/40 text-purple-300 rounded-3xl rounded-bl-sm p-4 flex items-center gap-3">
                 <Loader2 className="w-5 h-5 animate-spin" />
                 <span className="font-medium text-sm">Analisando dados...</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 z-10">
          <form onSubmit={handleSend} className="relative">
            <div className="relative group rounded-full overflow-hidden p-[2px]">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-600 opacity-60 group-hover:opacity-100 transition-opacity"></div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Gemini about operational data..."
                className="w-full relative z-10 bg-[#0f172a] rounded-full py-4 pl-6 pr-16 text-white placeholder-white/40 focus:outline-none"
                disabled={loading}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-cyan-400 text-[#0f172a] rounded-full hover:bg-cyan-300 hover:shadow-[0_0_15px_rgba(34,211,238,0.8)] transition-all z-20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} className="ml-1" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
