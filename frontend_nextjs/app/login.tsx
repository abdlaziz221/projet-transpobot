/* eslint-disable */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bus, Eye, EyeOff, Loader2, User, Lock, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { BASE_URL } from '../lib/api';
import { useToast } from '../components/ui/Toast';

/* ─── Particle system types ─── */
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  type: 'dot' | 'ring' | 'spark';
  rotation: number; rotSpeed: number;
}

const PARTICLE_COLORS = [
  '#c4581e', '#e07b3a', '#f0a040',
  '#00853F', '#4ade80',
  '#FDEF42',
  '#E31B23',
  'rgba(255,255,255,0.8)',
];

function spawnParticles(
  x: number, y: number,
  vxBase: number, vyBase: number,
  count: number,
  particles: Particle[]
) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * 2.5;
    const antiGravity = Math.random() < 0.35; // 35% float up
    particles.push({
      x, y,
      vx: vxBase * 0.15 + Math.cos(angle) * speed,
      vy: vyBase * 0.15 + Math.sin(angle) * speed * (antiGravity ? -1 : 1),
      life: 1,
      maxLife: 40 + Math.random() * 50,
      size: 2 + Math.random() * 5,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      type: Math.random() < 0.15 ? 'ring' : Math.random() < 0.3 ? 'spark' : 'dot',
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.15,
    });
  }
}

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const QUOTES = [
  {
    text: "Si j'avais demandé aux gens ce qu'ils voulaient, ils auraient répondu : des chevaux plus rapides.",
    author: "Henry Ford",
    role: "Fondateur, Ford Motor Company",
  },
  {
    text: "Le transport n'est pas seulement un déplacement de corps — c'est un déplacement de civilisations.",
    author: "Carlos Ghosn",
    role: "Ancien PDG, Renault-Nissan-Mitsubishi",
  },
  {
    text: "L'avenir appartient à ceux qui croient en la beauté de leurs rêves — et qui construisent les routes pour y arriver.",
    author: "Mary Barra",
    role: "PDG, General Motors",
  },
  {
    text: "L'électrification du transport est inévitable. La seule question est : serez-vous leader ou suiveur ?",
    author: "Elon Musk",
    role: "PDG, Tesla & SpaceX",
  },
  {
    text: "Une ville efficace est une ville dont le transport bat au rythme de ses habitants.",
    author: "Janette Sadik-Khan",
    role: "Ancienne Commissaire aux Transports, NYC",
  },
  {
    text: "Le vrai luxe du transport, c'est la ponctualité.",
    author: "Akio Toyoda",
    role: "Président, Toyota Motor Corporation",
  },
  {
    text: "L'Afrique n'a pas besoin de routes plus larges, mais de connexions plus intelligentes.",
    author: "Amina Mohammed",
    role: "Vice-Secrétaire générale de l'ONU",
  },
  {
    text: "Le transport urbain n'est pas un problème à résoudre, c'est une opportunité à saisir.",
    author: "Enrique Peñalosa",
    role: "Ancien Maire de Bogota",
  },
  {
    text: "Chaque kilomètre parcouru est une opportunité d'innovation.",
    author: "Dieter Zetsche",
    role: "Ancien PDG, Daimler AG",
  },
  {
    text: "La mobilité durable commence par comprendre les besoins réels des gens.",
    author: "Gillian Tett",
    role: "Journaliste économique, Financial Times",
  },
  {
    text: "Le transport connecté transforme les villes en écosystèmes vivants.",
    author: "Dan Ammann",
    role: "PDG, Logitech",
  },
  {
    text: "L'avenir du transport africain se construit aujourd'hui avec les données d'hier.",
    author: "Tidjane Thiam",
    role: "Ancien PDG, Credit Suisse",
  },
  {
    text: "La ponctualité n'est pas une option, c'est une promesse.",
    author: "Gwynne Shotwell",
    role: "Présidente, SpaceX",
  },
  {
    text: "Chaque trajet raconte une histoire, chaque donnée révèle une opportunité.",
    author: "Dara Khosrowshahi",
    role: "PDG, Uber",
  },
  {
    text: "Le transport intelligent commence par l'écoute des utilisateurs.",
    author: "Travis Kalanick",
    role: "Co-fondateur, Uber",
  },
  {
    text: "L'Afrique mérite un transport qui reflète son potentiel, pas ses contraintes.",
    author: "Ngozi Okonjo-Iweala",
    role: "Directrice générale, OMC",
  },
  {
    text: "La révolution du transport passe par la confiance dans les données.",
    author: "Andrew Ng",
    role: "Co-fondateur, Coursera",
  },
  {
    text: "Chaque véhicule est une extension de la communauté qu'il sert.",
    author: "Reed Hastings",
    role: "Co-fondateur, Netflix",
  },
  {
    text: "Le transport durable est celui qui crée de la valeur pour tous les acteurs.",
    author: "Satya Nadella",
    role: "PDG, Microsoft",
  },
  {
    text: "L'innovation en Afrique commence par résoudre les problèmes locaux avec des solutions globales.",
    author: "Strive Masiyiwa",
    role: "Fondateur, Econet Group",
  },
];

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);
  const toast = useToast();

  /* ─── Particle canvas ─── */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, px: 0, py: 0 });
  const rafRef = useRef<number>(0);
  const lastSpawnRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e: MouseEvent) => {
      const m = mouseRef.current;
      m.vx = e.clientX - m.px;
      m.vy = e.clientY - m.py;
      m.px = m.x; m.py = m.y;
      m.x = e.clientX; m.y = e.clientY;

      const now = performance.now();
      const speed = Math.hypot(m.vx, m.vy);
      const rate = speed > 8 ? 60 : speed > 3 ? 30 : 16; // ms between spawns
      if (now - lastSpawnRef.current > rate) {
        const count = speed > 10 ? 4 : speed > 4 ? 2 : 1;
        spawnParticles(m.x, m.y, m.vx, m.vy, count, particlesRef.current);
        lastSpawnRef.current = now;
      }
    };
    window.addEventListener('mousemove', onMove);

    const GRAVITY = 0.06;
    const MAX = 300;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const ps = particlesRef.current;

      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        // Physics
        p.x += p.vx;
        p.y += p.vy;
        p.vy += GRAVITY;
        p.vx *= 0.985;
        p.life -= 1 / p.maxLife;
        p.rotation += p.rotSpeed;
        p.size *= 0.998;

        if (p.life <= 0 || p.size < 0.3) { ps.splice(i, 1); continue; }

        const alpha = p.life * (p.life < 0.3 ? p.life / 0.3 : 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.type === 'dot') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.size * 2.5;
          ctx.fill();
        } else if (p.type === 'ring') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 1.2, 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.2;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.stroke();
        } else { // spark
          ctx.beginPath();
          const l = p.size * 3;
          ctx.moveTo(-l, 0); ctx.lineTo(l, 0);
          ctx.moveTo(0, -l * 0.4); ctx.lineTo(0, l * 0.4);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.stroke();
        }
        ctx.restore();
      }

      // Trim excess
      if (ps.length > MAX) ps.splice(0, ps.length - MAX);

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Rotate quotes every 3 seconds with fade
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => {
        setQuoteIndex(i => (i + 1) % QUOTES.length);
        setQuoteVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const prevQuote = () => {
    setQuoteVisible(false);
    setTimeout(() => {
      setQuoteIndex(i => (i - 1 + QUOTES.length) % QUOTES.length);
      setQuoteVisible(true);
    }, 300);
  };

  const nextQuote = () => {
    setQuoteVisible(false);
    setTimeout(() => {
      setQuoteIndex(i => (i + 1) % QUOTES.length);
      setQuoteVisible(true);
    }, 300);
  };

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
          if (rememberMe) localStorage.setItem('rememberedUser', username);
        }
        toast.success('Connexion réussie', 'Bienvenue sur TranspoBot');
        setTimeout(onLoginSuccess, 500);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error('Échec de connexion', data.detail || 'Identifiants incorrects');
      }
    } catch (err) {
      toast.error('Erreur réseau', 'Impossible de joindre le serveur');
    } finally {
      setIsLoading(false);
    }
  };

  const quote = QUOTES[quoteIndex];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#07090f',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* ─── Particle canvas ─── */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Senegalese pattern overlay — inspired by the boubou fabric geometry */}
      <svg style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity: 0.03,
        pointerEvents: 'none',
      }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="senPattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="30" height="30" fill="#00853F" />
            <rect x="30" y="30" width="30" height="30" fill="#00853F" />
            <polygon points="30,0 60,0 30,30" fill="#FDEF42" />
            <polygon points="0,30 30,30 0,60" fill="#FDEF42" />
            <circle cx="30" cy="30" r="8" fill="#E31B23" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#senPattern)" />
      </svg>

      {/* Warm terracotta glow — évoque Dakar au coucher du soleil */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '-5%',
        width: '700px',
        height: '700px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(196,88,30,0.13) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      {/* Green glow — flag */}
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        right: '-5%',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,133,63,0.1) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* === LEFT PANEL === */}
      <div className="hide-mobile" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: window?.innerWidth < 1024 ? '32px 32px' : '52px 64px',
        position: 'relative',
        zIndex: 1,
        borderRight: '1px solid var(--border)',
      }}>
        {/* Top — Logo + tagline */}
        <div>
          {/* Logo */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 18px',
            background: 'rgba(196,88,30,0.1)',
            border: '1px solid rgba(196,88,30,0.25)',
            borderRadius: '12px',
            marginBottom: '48px',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #c4581e, #e07b3a)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Bus size={20} color="white" strokeWidth={2} />
            </div>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>
              TranspoBot
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#e07b3a',
              background: 'rgba(196,88,30,0.15)',
              padding: '2px 8px',
              borderRadius: '4px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Sénégal 🇸🇳
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: '42px',
            fontWeight: 800,
            color: 'white',
            lineHeight: 1.1,
            letterSpacing: '-0.04em',
            marginBottom: '16px',
          }}>
            Teranga & <br />
            <span style={{
              background: 'linear-gradient(135deg, #c4581e 0%, #f0a040 50%, #00853F 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Mobilité.
            </span>
          </h1>
          <p style={{
            fontSize: '15px',
            color: 'rgba(255,255,255,0.4)',
            lineHeight: 1.7,
            maxWidth: '380px',
            marginBottom: '40px',
          }}>
            La plateforme de gestion de flotte pensée pour le transport africain —
            précise, intelligente, et ancrée dans la réalité du terrain.
          </p>

          {/* Senegalese flag strip */}
          <div style={{
            display: 'flex',
            height: '20px',
            width: '120px',
            borderRadius: '5px',
            overflow: 'hidden',
            marginBottom: '40px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            <div style={{ flex: 1, background: '#00853F' }} />
            <div style={{
              flex: 1,
              background: '#FDEF42',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {/* Green star — exactly like the Senegalese flag */}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon
                  points="5,0.5 6.18,3.82 9.76,3.82 6.94,5.9 8.09,9.24 5,7.12 1.91,9.24 3.06,5.9 0.24,3.82 3.82,3.82"
                  fill="#00853F"
                />
              </svg>
            </div>
            <div style={{ flex: 1, background: '#E31B23' }} />
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '32px' }}>
            <StatItem value="500+" label="Véhicules gérés" />
            <StatItem value="98%" label="Disponibilité" />
            <StatItem value="24/7" label="Monitoring" />
          </div>
        </div>

        {/* Bottom — Rotating quote */}
        <div style={{
          marginTop: '48px',
          padding: '28px 32px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          position: 'relative',
        }}>
          {/* Decorative quote mark */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '24px',
            fontSize: '60px',
            lineHeight: 1,
            color: '#c4581e',
            opacity: 0.3,
            fontFamily: 'Georgia, serif',
            userSelect: 'none',
          }}>
            "
          </div>

          {/* Quote text */}
          <div style={{
            minHeight: '80px',
            display: 'flex',
            alignItems: 'center',
            opacity: quoteVisible ? 1 : 0,
            transform: quoteVisible ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
            paddingTop: '12px',
          }}>
            <div>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.75)',
                lineHeight: 1.7,
                fontStyle: 'italic',
                marginBottom: '14px',
              }}>
                {quote.text}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #c4581e, #e07b3a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'white',
                  flexShrink: 0,
                }}>
                  {quote.author.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{quote.author}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{quote.role}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation + dots */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '20px',
          }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {QUOTES.map((_, i) => (
                <div key={i} style={{
                  width: i === quoteIndex ? '20px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  background: i === quoteIndex ? '#c4581e' : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }} onClick={() => {
                  setQuoteVisible(false);
                  setTimeout(() => { setQuoteIndex(i); setQuoteVisible(true); }, 300);
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <NavBtn onClick={prevQuote}><ChevronLeft size={14} /></NavBtn>
              <NavBtn onClick={nextQuote}><ChevronRight size={14} /></NavBtn>
            </div>
          </div>
        </div>

        <p style={{
          marginTop: '24px',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.15)',
          letterSpacing: '0.02em',
        }}>
          © 2026 TranspoBot Sénégal 🇸🇳 · Dakar, Sénégal
        </p>
      </div>

      {/* === RIGHT PANEL — Login Form === */}
      <div style={{
        width: '100%',
        maxWidth: window?.innerWidth < 640 ? '100%' : '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: window?.innerWidth < 640 ? '20px' : '40px 48px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ width: '100%' }}>
          {/* Mobile logo */}
          <div className="hide-desktop" style={{ marginBottom: '32px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #c4581e, #e07b3a)',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bus size={22} color="white" />
              </div>
              <span style={{ fontSize: '20px', fontWeight: 700, color: 'white' }}>TranspoBot</span>
            </div>
          </div>

          {/* Header */}
          <div style={{ marginBottom: '36px' }}>
            {/* Senegalese greeting */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              background: 'rgba(0,133,63,0.1)',
              border: '1px solid rgba(0,133,63,0.2)',
              borderRadius: '20px',
              marginBottom: '16px',
            }}>
              <span style={{ fontSize: '14px' }}>🇸🇳</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#4ade80', letterSpacing: '0.03em' }}>
                Bienvenue — Dalal ak diam
              </span>
            </div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-0.03em',
              marginBottom: '6px',
            }}>
              Connexion
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)' }}>
              Entrez vos identifiants pour accéder à votre espace.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Username */}
            <div>
              <label style={labelStyle}>Identifiant</label>
              <div style={{ position: 'relative' }}>
                <span style={iconLeftStyle}><User size={16} /></span>
                <input
                  type="text"
                  placeholder="Votre identifiant"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={applyFocus}
                  onBlur={removeFocus}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <span style={iconLeftStyle}><Lock size={16} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: '48px' }}
                  onFocus={applyFocus}
                  onBlur={removeFocus}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', padding: 0,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '13px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#c4581e' }}
                />
                Se souvenir de moi
              </label>
              <a href="#" style={{
                fontSize: '13px', color: '#e07b3a', textDecoration: 'none', fontWeight: 500,
                transition: 'color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f0a060')}
                onMouseLeave={e => (e.currentTarget.style.color = '#e07b3a')}
              >
                Mot de passe oublié ?
              </a>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: 'white',
                backgroundImage: isLoading
                  ? 'none'
                  : 'linear-gradient(135deg, #c4581e 0%, #e07b3a 50%, #c4581e 100%)',
                backgroundColor: isLoading ? 'rgba(196,88,30,0.4)' : 'transparent',
                border: 'none',
                borderRadius: '10px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
                transition: 'all 0.3s ease',
                boxShadow: isLoading ? 'none' : '0 4px 24px rgba(196,88,30,0.4)',
              }}
              onMouseEnter={e => {
                if (!isLoading) {
                  e.currentTarget.style.boxShadow = '0 6px 32px rgba(196,88,30,0.6)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(196,88,30,0.4)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {isLoading ? (
                <><Loader2 className="animate-spin" size={16} />Connexion en cours…</>
              ) : (
                'Se connecter →'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{
            marginTop: '28px',
            padding: '16px 18px',
            background: 'rgba(196,88,30,0.05)',
            borderRadius: '10px',
            border: '1px solid rgba(196,88,30,0.15)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              fontSize: '11px', fontWeight: 700, color: '#e07b3a',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px',
            }}>
              <ShieldCheck size={13} />
              Accès démo
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              <DemoCredential label="Admin" user="admin" pass="passer" />
            </div>
          </div>

          {/* Mobile quote */}
          <div className="hide-desktop" style={{
            marginTop: '24px',
            padding: '16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            opacity: quoteVisible ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginBottom: '8px' }}>
              "{quote.text}"
            </p>
            <p style={{ fontSize: '11px', color: '#e07b3a', fontWeight: 600 }}>— {quote.author}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Shared styles ---- */

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: 'rgba(255,255,255,0.4)',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 14px 13px 42px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '10px',
  fontSize: '14px',
  color: 'white',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
  boxSizing: 'border-box',
};

const iconLeftStyle: React.CSSProperties = {
  position: 'absolute',
  left: '14px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'rgba(255,255,255,0.25)',
  display: 'flex',
  alignItems: 'center',
  pointerEvents: 'none',
};

function applyFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'rgba(196,88,30,0.6)';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(196,88,30,0.12)';
  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
}
function removeFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
  e.currentTarget.style.boxShadow = 'none';
  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
}

/* ---- Sub-components ---- */

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      width: '28px', height: '28px', borderRadius: '6px',
      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
      cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(196,88,30,0.2)'; e.currentTarget.style.color = '#e07b3a'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
    >
      {children}
    </button>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: '22px', fontWeight: 800, color: 'white', letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function DemoCredential({ label, user, pass }: { label: string; user: string; pass: string }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{user}</div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{pass}</div>
    </div>
  );
}
