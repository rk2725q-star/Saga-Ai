import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';

export default function Auth({ setSession }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSession(data.session);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });
        if (error) throw error;
        if (data.session) {
            setSession(data.session);
        } else {
            setSuccessMessage('Registration successful! Please check your email inbox to verify your account.');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app flex-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '24px' }}>
      <motion.div 
        className="quick-card auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: '400px' }}
      >
        <div style={{ textAlign: 'center', width: '100%', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>
            {isLogin ? 'Welcome back' : 'Create SAGE Account'}
          </h2>
          <p style={{ color: 'var(--c-text-2)', fontSize: '14px' }}>
            {isLogin ? 'Enter your details to access your health memory' : 'Start tracking your wellness journey privately'}
          </p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(255, 60, 60, 0.1)', 
            color: '#d32f2f', 
            padding: '12px', 
            borderRadius: 'var(--r-sm)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.1)', 
            color: '#059669', 
            padding: '12px', 
            borderRadius: 'var(--r-sm)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            <CheckCircle size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          
          {!isLogin && (
            <div className="input-group">
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-3)', fontSize: '18px' }}>👤</div>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  style={{
                    width: '100%',
                    padding: '14px 14px 14px 44px',
                    borderRadius: 'var(--r-full)',
                    border: '1px solid var(--c-border)',
                    background: 'var(--c-surface-3)',
                    color: 'var(--c-text-1)',
                    fontSize: '15px',
                    outline: 'none',
                    boxShadow: '0 3px 6px rgba(0,0,0,0.06) inset, 0 -1px 2px rgba(255,255,255,0.7) inset'
                  }}
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-3)' }} />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  borderRadius: 'var(--r-full)',
                  border: '1px solid var(--c-border)',
                  background: 'var(--c-surface-3)',
                  color: 'var(--c-text-1)',
                  fontSize: '15px',
                  outline: 'none',
                  boxShadow: '0 3px 6px rgba(0,0,0,0.06) inset, 0 -1px 2px rgba(255,255,255,0.7) inset'
                }}
              />
            </div>
          </div>

          <div className="input-group">
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-3)' }} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  borderRadius: 'var(--r-full)',
                  border: '1px solid var(--c-border)',
                  background: 'var(--c-surface-3)',
                  color: 'var(--c-text-1)',
                  fontSize: '15px',
                  outline: 'none',
                  boxShadow: '0 3px 6px rgba(0,0,0,0.06) inset, 0 -1px 2px rgba(255,255,255,0.7) inset'
                }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', width: '100%' }}>
          <button 
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccessMessage(null);
            }}
            style={{ background: 'none', border: 'none', color: 'var(--c-primary-2)', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
