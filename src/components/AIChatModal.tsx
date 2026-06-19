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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 transition-all duration-300">
      <div className="bg-[#0b0f19] border border-cyan/40 rounded-3xl w-full max-w-4xl flex flex-col h-[85vh] sm:h-[90vh] shadow-[0_0_60px_rgba(0,255,255,0.15)] overflow-hidden relative">
        
        {/* Background glow effects */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan/10 to-transparent pointer-events-none"></div>
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-500/20 blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-cyan/20 blur-[100px] pointer-events-none"></div>

        <div className="flex justify-between items-center p-5 border-b border-white/10 bg-[#0f172a]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-cyan/20 to-purple-500/20 rounded-xl border border-cyan/30 shadow-[0_0_15px_rgba(0,255,255,0.3)]">
                <Bot className="text-cyan w-6 h-6" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex items-center justify-center bg-[#0b0f19] rounded-full p-0.5">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
              </div>
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-transparent bg-clip-text bg-gradient-to-r from-cyan to-purple-400 flex items-center gap-2">
                Gemini Operacional <Sparkles size={16} className="text-purple-400" />
              </h3>
              <p className="text-sm text-gray-400 font-medium">Análise de Dados em Tempo Real</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 border border-white/10 rounded-full text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-300">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 z-10 scrollbar-thin scrollbar-thumb-cyan/30 scrollbar-track-transparent">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border shadow-lg ${
                msg.role === 'user' 
                  ? 'bg-cyan/10 border-cyan/30 text-cyan' 
                  : 'bg-purple-900/30 border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              }`}>
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={`max-w-[85%] rounded-3xl p-5 text-sm sm:text-base leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-cyan to-blue-500 text-black font-medium rounded-tr-none shadow-md' 
                  : 'bg-[#1e293b]/80 backdrop-blur-md border border-white/10 text-gray-200 rounded-tl-none shadow-lg'
              }`}>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <div className="prose-custom">
                    <ReactMarkdown
                      components={{
                        strong: ({node, ...props}) => <strong className="text-cyan font-bold" {...props} />,
                        h1: ({node, ...props}) => <h1 className="text-2xl font-extrabold text-white mt-5 mb-3 border-b border-white/10 pb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-bold text-white mt-4 mb-2" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-bold text-purple-300 mt-3 mb-2" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 my-3 space-y-1.5 text-gray-300" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-3 space-y-1.5 text-gray-300" {...props} />,
                        li: ({node, ...props}) => <li className="marker:text-cyan" {...props} />,
                        p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                        code: ({node, ...props}) => <code className="bg-black/50 text-cyan px-1.5 py-0.5 rounded font-mono text-sm border border-cyan/20" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-purple-500 pl-4 py-1 my-3 bg-purple-500/10 rounded-r-lg text-gray-300 italic" {...props} />
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4 animate-pulse">
               <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                 <Bot size={20} />
               </div>
               <div className="bg-[#1e293b]/80 border border-cyan/20 rounded-3xl rounded-tl-none p-5 flex items-center gap-3 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
                 <Loader2 className="w-5 h-5 text-cyan animate-spin" />
                 <span className="text-cyan font-medium">O Gemini está analisando os dados...</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 sm:p-6 bg-[#0f172a]/90 backdrop-blur-md border-t border-white/10 z-10">
          <form onSubmit={handleSend} className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua pergunta (Ex: Quais os maiores gargalos dessa obra?)"
              className="w-full bg-[#1e293b] border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-white placeholder-gray-500 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan focus:bg-[#0b0f19] transition-all duration-300 shadow-inner"
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gradient-to-r from-cyan to-blue-500 text-black rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md transform active:scale-95"
            >
              <Send size={18} className={loading || !input.trim() ? "opacity-50" : "opacity-100"} />
            </button>
          </form>
          <div className="mt-3 text-center text-xs text-gray-500 font-medium flex justify-center items-center gap-1">
            <Sparkles size={12} className="text-purple-500" />
            Respostas geradas por IA podem conter imprecisões. Verifique os dados.
          </div>
        </div>

      </div>
    </div>
  );
}
