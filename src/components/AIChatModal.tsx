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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '20px' }}>
      <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', height: '80vh', borderRadius: '32px', overflow: 'hidden', background: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(0, 210, 255, 0.4)', boxShadow: '0 0 60px rgba(0, 210, 255, 0.15)' }}>
        
        {/* Glow Effects inside Modal */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '300px', background: 'rgba(0, 210, 255, 0.15)', filter: 'blur(100px)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '300px', height: '300px', background: 'rgba(168, 85, 247, 0.15)', filter: 'blur(100px)', pointerEvents: 'none' }}></div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sparkles size={20} style={{ color: '#00d2ff' }} />
            <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.9)' }}>GEMINI ASSISTANT</h3>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00d2ff', boxShadow: '0 0 10px #00d2ff', marginLeft: '8px' }}></div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '8px' }}>
            <X size={24} />
          </button>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: '24px', zIndex: 10 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', width: '100%', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '85%' }}>
                <div style={{ 
                  padding: '20px', 
                  fontSize: '15px', 
                  lineHeight: '1.6', 
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)', 
                  backdropFilter: 'blur(10px)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: msg.role === 'user' ? '1px solid rgba(0, 210, 255, 0.5)' : '1px solid rgba(168, 85, 247, 0.4)',
                  color: msg.role === 'user' ? '#e0f7fa' : '#f3e8ff',
                  borderRadius: msg.role === 'user' ? '24px 24px 4px 24px' : '24px 24px 24px 4px'
                }}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <div style={{ color: 'rgba(255,255,255,0.9)' }}>
                      <ReactMarkdown
                        components={{
                          strong: ({node, ...props}) => <strong style={{ color: 'white', fontWeight: 'bold' }} {...props} />,
                          h1: ({node, ...props}) => <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: '16px 0 8px 0' }} {...props} />,
                          h2: ({node, ...props}) => <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white', margin: '12px 0 8px 0' }} {...props} />,
                          h3: ({node, ...props}) => <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#00d2ff', margin: '8px 0 4px 0' }} {...props} />,
                          ul: ({node, ...props}) => <ul style={{ paddingLeft: '20px', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: '4px', color: 'rgba(255,255,255,0.8)' }} {...props} />,
                          ol: ({node, ...props}) => <ol style={{ paddingLeft: '20px', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: '4px', color: 'rgba(255,255,255,0.8)' }} {...props} />,
                          li: ({node, ...props}) => <li style={{ color: 'inherit' }} {...props} />,
                          p: ({node, ...props}) => <p style={{ margin: '0 0 8px 0' }} {...props} />
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, padding: '0 8px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                  {msg.role === 'user' ? 'Você' : 'Gemini AI'}
                </span>
              </div>
            </div>
          ))}
          
          {loading && (
            <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-start' }}>
               <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(168, 85, 247, 0.4)', color: '#d8b4fe', borderRadius: '24px 24px 24px 4px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <Loader2 size={20} className="animate-spin" />
                 <span style={{ fontWeight: 500, fontSize: '14px' }}>Analisando dados...</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '24px', zIndex: 10 }}>
          <form onSubmit={handleSend} style={{ position: 'relative' }}>
            <div style={{ position: 'relative', borderRadius: '50px', overflow: 'hidden', padding: '2px', background: 'linear-gradient(90deg, #00d2ff, #a855f7)' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Gemini about operational data..."
                style={{ width: '100%', background: '#0f172a', borderRadius: '50px', padding: '16px 64px 16px 24px', color: 'white', border: 'none', outline: 'none', fontSize: '15px' }}
                disabled={loading}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#00d2ff', color: '#0f172a', borderRadius: '50%', border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', opacity: loading || !input.trim() ? 0.5 : 1, transition: 'all 0.3s' }}
            >
              <Send size={18} style={{ marginLeft: '2px' }} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
