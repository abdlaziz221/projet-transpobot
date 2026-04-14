/* eslint-disable */

'use client';

import React, { useState } from 'react';
import { Bus, Eye, EyeOff, Loader2, Mail, Lock, CheckCircle } from 'lucide-react';
import { fetchWithAuth, BASE_URL } from '../lib/api';
import { useToast } from '../components/ui/Toast';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const toast = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          localStorage.setItem('token', data.access_token);
          if (rememberMe) {
            localStorage.setItem('rememberedUser', username);
          }
        }
        toast.success('Connexion réussie', 'Bienvenue sur TranspoBot');
        setTimeout(onLoginSuccess, 500);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error('Échec de connexion', data.detail || 'Identifiants incorrects');
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Erreur réseau', 'Impossible de joindre le serveur');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page" style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      {/* Decorative Circles */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-5%',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.1)',
        filter: 'blur(80px)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '-5%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.1)',
        filter: 'blur(80px)',
      }} />

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Left Side - Branding */}
        <div className="hide-mobile" style={{
          flex: 1,
          maxWidth: '500px',
          marginRight: 'var(--space-16)',
          color: 'white',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 'var(--radius-2xl)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-6)',
            backdropFilter: 'blur(10px)',
          }}>
            <Bus size={40} color="white" strokeWidth={1.5} />
          </div>
          <h1 style={{
            fontSize: 'var(--text-4xl)',
            fontWeight: 800,
            marginBottom: 'var(--space-4)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}>
            TranspoBot
            <br />
            <span style={{ opacity: 0.9 }}>Enterprise</span>
          </h1>
          <p style={{
            fontSize: 'var(--text-lg)',
            opacity: 0.9,
            marginBottom: 'var(--space-8)',
            lineHeight: 1.6,
          }}>
            Système de gestion de flotte et d'analyse de données pour transport urbain.
          </p>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <FeatureItem icon="📊" text="Dashboard analytique en temps réel" />
            <FeatureItem icon="🤖" text="Assistant IA pour requêtes naturelles" />
            <FeatureItem icon="🚍" text="Gestion complète de flotte" />
            <FeatureItem icon="📱" text="Interface moderne et responsive" />
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div style={{
          width: '100%',
          maxWidth: '440px',
        }}>
          <div className="card animate-up" style={{
            padding: 'var(--space-8)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            {/* Logo Mobile */}
            <div className="hide-desktop" style={{
              width: '60px',
              height: '60px',
              background: 'var(--gradient-primary)',
              borderRadius: 'var(--radius-xl)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-6)',
              margin: '0 auto var(--space-6)',
            }}>
              <Bus size={32} color="white" />
            </div>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
              <h2 style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: 800,
                color: 'var(--text-main)',
                marginBottom: 'var(--space-2)',
              }}>
                Connexion
              </h2>
              <p style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-muted)',
              }}>
                Accédez à votre espace de gestion
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {/* Username */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Identifiant
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: 'var(--space-3)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none',
                  }}>
                    <Mail size={18} />
                  </span>
                  <input
                    type="text"
                    placeholder="admin"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: 'var(--space-3) var(--space-3) var(--space-3) var(--space-10)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: 'var(--text-sm)',
                      outline: 'none',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-100)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Mot de passe
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: 'var(--space-3)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none',
                  }}>
                    <Lock size={18} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: 'var(--space-3) var(--space-10) var(--space-3) var(--space-10)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: 'var(--text-sm)',
                      outline: 'none',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-100)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 'var(--space-3)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer',
                      accentColor: 'var(--primary)',
                    }}
                  />
                  Se souvenir de moi
                </label>
                <a href="#" style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--primary)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}>
                  Mot de passe oublié ?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-2)',
                  marginTop: 'var(--space-2)',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div style={{
              marginTop: 'var(--space-6)',
              padding: 'var(--space-4)',
              background: 'var(--primary-50)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--primary-100)',
            }}>
              <p style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--primary-700)',
                marginBottom: 'var(--space-3)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
              }}>
                <CheckCircle size={14} />
                Identifiants de démo
              </p>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--primary-800)', lineHeight: 1.8 }}>
                <div><strong>Admin:</strong> admin / admin123</div>
                <div><strong>Aziz:</strong> aziz / passer</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p style={{
            textAlign: 'center',
            fontSize: 'var(--text-xs)',
            color: 'rgba(255, 255, 255, 0.8)',
            marginTop: 'var(--space-6)',
          }}>
            © 2024 TranspoBot Enterprise. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      fontSize: 'var(--text-base)',
      color: 'rgba(255, 255, 255, 0.95)',
    }}>
      <span style={{
        width: '32px',
        height: '32px',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'var(--text-lg)',
      }}>
        {icon}
      </span>
      {text}
    </div>
  );
}
