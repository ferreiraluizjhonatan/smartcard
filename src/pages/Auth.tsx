import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Building2 } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot_password';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
        }
      }
    });
    
    if (error) {
      alert(error.message);
    } else {
      alert('Cadastro Master realizado! Verifique seu email se necessário, ou tente fazer login.');
      setMode('login');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) {
      alert(error.message);
    } else {
      alert('Email de recuperação enviado!');
      setMode('login');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div className="brand-icon" style={{ width: '48px', height: '48px' }}>
              <Building2 size={24} />
            </div>
          </div>
          <h2 className="gradient-text">Smartcard</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>Gestão Ágil de elevadores NI</p>
        </div>

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>E-mail</label>
              <input type="email" className="input-field" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Senha</label>
              <input type="password" className="input-field" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div style={{ textAlign: 'right', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => setMode('forgot_password')}>Esqueci minha senha</span>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
            <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Não tem uma conta Master? <span style={{ color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => setMode('signup')}>Cadastre-se (Máx 2)</span>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignup}>
            <div className="input-group">
              <label>Seu Nome Completo</label>
              <input type="text" className="input-field" placeholder="João Silva" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Nome da Empresa</label>
              <input type="text" className="input-field" placeholder="Elevadores Tech" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>E-mail Master</label>
              <input type="email" className="input-field" placeholder="master@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Senha Segura</label>
              <input type="password" className="input-field" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={loading}>{loading ? 'Registrando...' : 'Criar Conta Master'}</button>
            <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Já possui conta? <span style={{ color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => setMode('login')}>Fazer Login</span>
            </div>
          </form>
        )}

        {mode === 'forgot_password' && (
          <form onSubmit={handleResetPassword}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', textAlign: 'center' }}>Digite seu email para receber um link de redefinição de senha.</p>
            <div className="input-group">
              <label>E-mail</label>
              <input type="email" className="input-field" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={loading}>{loading ? 'Enviando...' : 'Recuperar Senha'}</button>
            <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Lembrou a senha? <span style={{ color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => setMode('login')}>Fazer Login</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
