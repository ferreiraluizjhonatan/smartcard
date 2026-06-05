import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
        { id: '1', role: 'assistant', content: 'Olá! Sou seu Assistente de Inteligência Operacional. Analisei o contexto da obra e da equipe. Como posso te apoiar com essas informações?' }
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
        content: result.response
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao consultar o assistente de IA. Verifique se o servidor local (Ollama) está ativo.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111111] border border-cyan/30 rounded-2xl w-full max-w-2xl flex flex-col h-[80vh] shadow-[0_0_40px_rgba(0,255,255,0.1)] overflow-hidden">
        
        <div className="flex justify-between items-center p-4 border-b border-cyan/20 bg-[#161616]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan/10 rounded-lg">
              <Bot className="text-cyan w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Inteligência Operacional IA</h3>
              <p className="text-xs text-gray-400">Suporte Contextual em Tempo Real</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#111111] to-[#0a0a0a]">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === 'user' ? 'bg-cyan/20 text-cyan' : 'bg-purple-500/20 text-purple-400'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[80%] rounded-2xl p-4 text-sm whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-cyan text-black rounded-tr-none' 
                  : 'bg-[#1a1a1a] border border-white/5 text-gray-200 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
               <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                 <Bot size={16} />
               </div>
               <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                 <Loader2 className="w-4 h-4 text-cyan animate-spin" />
                 <span className="text-gray-400 text-sm">Analisando dados operacionais...</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-[#161616] border-t border-cyan/20">
          <form onSubmit={handleSend} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: Como recuperar o atraso desta equipe?"
              className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-4 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyan text-black rounded-lg hover:bg-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
