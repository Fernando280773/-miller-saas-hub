'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layers, Shield, Sparkles, ArrowRight, CheckCircle, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { DEMO_USERS, setActiveUser, UserRole } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'password' | 'magic_link'>('password');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleDemoLogin = (role: UserRole) => {
    const user = DEMO_USERS[role];
    setActiveUser(user);
    setToastMsg(`✓ Authenticated as ${user.name}`);
    setTimeout(() => {
      router.push('/dashboard');
    }, 600);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setToastMsg(null);

    try {
      if (authMode === 'magic_link') {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        setToastMsg('✉️ Magic link sent to your email. Check your inbox!');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: password || 'defaultpassword123'
        });

        if (error) {
          // If Supabase authentication fails (or using mock/local keys), fallback to custom session
          console.warn('Supabase auth fallback:', error.message);
          const fallbackUser = {
            id: `usr-${Date.now().toString(36)}`,
            email,
            name: email.split('@')[0],
            role: 'owner' as UserRole,
            store_id: 'store-1',
            avatar_emoji: '👑'
          };
          setActiveUser(fallbackUser);
          setToastMsg('✓ Signed in successfully (Demo Session)');
          setTimeout(() => router.push('/dashboard'), 600);
          return;
        }

        if (data.user) {
          setActiveUser({
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.name || email.split('@')[0],
            role: (data.user.user_metadata?.role as UserRole) || 'owner',
            store_id: 'store-1',
            avatar_emoji: '👑'
          });
          setToastMsg('✓ Signed in successfully!');
          setTimeout(() => router.push('/dashboard'), 600);
        }
      }
    } catch (err: unknown) {
      setToastMsg(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080e1a',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background radial orbs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '20%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(239,23,142,0.12) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '20%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(28,216,210,0.1) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <header style={{
        padding: '1.5rem 2.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        zIndex: 10
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: '#fff' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #EF178E, #8E54E9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(239,23,142,0.35)'
          }}>
            <Layers size={20} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Miller SaaS Hub</span>
        </Link>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={14} color="#10B981" />
          <span>v2 RBAC Security Engine</span>
        </div>
      </header>

      {/* Main Container */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(13, 21, 39, 0.75)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 20,
          padding: '2.25rem',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 20,
              background: 'rgba(108,99,255,0.15)',
              border: '1px solid rgba(108,99,255,0.3)',
              color: '#818cf8',
              fontSize: '0.75rem',
              fontWeight: 700,
              marginBottom: '0.75rem'
            }}>
              <Sparkles size={12} /> Powered by Miller AI
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.4rem' }}>Merchant Portal Login</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0 }}>
              Access your multi-tenant dashboards &amp; AI agents
            </p>
          </div>

          {/* Toast Notification */}
          {toastMsg && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 10,
              background: toastMsg.startsWith('✓') ? 'rgba(16,185,129,0.15)' : 'rgba(108,99,255,0.15)',
              border: `1px solid ${toastMsg.startsWith('✓') ? 'rgba(16,185,129,0.3)' : 'rgba(108,99,255,0.3)'}`,
              color: toastMsg.startsWith('✓') ? '#4ade80' : '#818cf8',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
              textAlign: 'center'
            }}>
              {toastMsg}
            </div>
          )}

          {/* 1-Click Instant Demo Role Switchers */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
              ⚡ 1-Click Demo Accounts (RBAC)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleDemoLogin('owner')}
                style={{
                  padding: '0.65rem 0.5rem',
                  background: 'rgba(239,23,142,0.1)',
                  border: '1px solid rgba(239,23,142,0.3)',
                  borderRadius: 10,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                👑 <div style={{ marginTop: 2, color: '#f472b6' }}>Store Owner</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('manager')}
                style={{
                  padding: '0.65rem 0.5rem',
                  background: 'rgba(142,84,233,0.1)',
                  border: '1px solid rgba(142,84,233,0.3)',
                  borderRadius: 10,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                💼 <div style={{ marginTop: 2, color: '#c084fc' }}>Manager</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('staff')}
                style={{
                  padding: '0.65rem 0.5rem',
                  background: 'rgba(28,216,210,0.1)',
                  border: '1px solid rgba(28,216,210,0.3)',
                  borderRadius: 10,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                🛡️ <div style={{ marginTop: 2, color: '#2dd4bf' }}>Staff</div>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '1.25rem 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Or Sign In With Email</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="merchant@example.com"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
            </div>

            {authMode === 'password' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#818cf8', marginTop: 2 }}>
              <button
                type="button"
                onClick={() => setAuthMode(m => m === 'password' ? 'magic_link' : 'password')}
                style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', padding: 0, fontSize: '0.75rem', fontWeight: 600 }}
              >
                {authMode === 'password' ? '✨ Sign in with Magic Link' : '🔑 Sign in with Password'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '0.5rem',
                padding: '12px',
                borderRadius: 50,
                background: 'linear-gradient(135deg, #EF178E, #8E54E9)',
                border: 'none',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 8px 25px rgba(239,23,142,0.3)',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Authenticating...' : authMode === 'magic_link' ? 'Send Magic Link →' : 'Sign In →'}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '1.25rem',
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.4)',
        borderTop: '1px solid rgba(255,255,255,0.06)'
      }}>
        © {new Date().getFullYear()} Miller SaaS Hub · 80% AI Agent Driven · Multi-Tenant Infrastructure
      </footer>
    </div>
  );
}
