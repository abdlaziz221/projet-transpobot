/* eslint-disable */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Code, Table as TableIcon, FileSpreadsheet, Trash2,
  Zap, BarChart2, Users, TrendingUp, ArrowUp,
  Database, ChevronDown, ChevronUp, Copy, Check,
  Mic, MicOff, Volume2, VolumeX,
} from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { exportToExcel } from '../lib/excelUtils';
import { useToast } from './ui/Toast';

type AiState = 'idle' | 'thinking' | 'result';

// ─────────────────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────────────────
function SparkSvg({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L14.5 9H22L16 13.5L18.5 21L12 16.5L5.5 21L8 13.5L2 9H9.5L12 2Z"
        fill="white" fillOpacity="0.92" />
    </svg>
  );
}
function BusSvg() {
  return (
    <svg width="18" height="14" viewBox="0 0 20 14" fill="none">
      <rect x="1" y="1" width="18" height="9" rx="2" stroke="white" strokeWidth="1.5" />
      <circle cx="5" cy="12" r="1.5" stroke="white" strokeWidth="1.5" />
      <circle cx="15" cy="12" r="1.5" stroke="white" strokeWidth="1.5" />
      <line x1="1" y1="5" x2="19" y2="5" stroke="white" strokeWidth="1" />
      <line x1="10" y1="1" x2="10" y2="5" stroke="white" strokeWidth="1" />
    </svg>
  );
}
function PulseSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" fill="white" fillOpacity="0.9" />
      <circle cx="12" cy="4" r="1.5" fill="white" fillOpacity="0.55" />
      <circle cx="12" cy="20" r="1.5" fill="white" fillOpacity="0.55" />
      <circle cx="4" cy="12" r="1.5" fill="white" fillOpacity="0.55" />
      <circle cx="20" cy="12" r="1.5" fill="white" fillOpacity="0.55" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MORPHING AVATAR
// ─────────────────────────────────────────────────────────────────────────────
function MorphingAvatar({ state, size = 40 }: { state: AiState; size?: number }) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0, position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer glow ring */}
      <div className={`av-glow av-glow--${state}`} />
      {/* Morphing blob body */}
      <div className={`av-blob av-blob--${state}`}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          {state === 'result'   ? <BusSvg />   :
           state === 'thinking' ? <PulseSvg /> :
                                  <SparkSvg size={16} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RIPPLE SUGGESTION PILL
// ─────────────────────────────────────────────────────────────────────────────
interface RipplePoint { id: number; x: number; y: number; }

function RippleSuggestion({ label, icon, onClick }: {
  label: string; icon: React.ReactNode; onClick: () => void;
}) {
  const [ripples, setRipples] = useState<RipplePoint[]>([]);
  const [hovered, setHovered] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const idRef  = useRef(0);

  const spawnRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const id   = ++idRef.current;
    setRipples(p => [...p, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(p => p.filter(r => r.id !== id)), 750);
  };

  return (
    <button ref={btnRef}
      onClick={onClick}
      onMouseEnter={e => { setHovered(true); spawnRipple(e); }}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '7px 14px', borderRadius: '20px',
        border: `1px solid ${hovered ? 'rgba(196,88,30,0.45)' : 'rgba(255,255,255,0.08)'}`,
        background: hovered ? 'rgba(196,88,30,0.1)' : 'rgba(255,255,255,0.04)',
        color: hovered ? '#e07b3a' : 'rgba(255,255,255,0.55)',
        fontSize: '12px', fontWeight: 500, cursor: 'pointer',
        whiteSpace: 'nowrap', flexShrink: 0,
        transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {ripples.map(r => (
        <span key={r.id} className="ripple-ring"
          style={{ left: r.x, top: r.y }} />
      ))}
      {icon} {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE  (with shimmer data-stream effect)
// ─────────────────────────────────────────────────────────────────────────────
function MessageBubble({ m, idx, onToggleSql, onCopySql, copied, onSpeak }: any) {
  const isUser = m.role === 'user';
  const [shimmer, setShimmer] = useState(!!m.isNew);

  useEffect(() => {
    if (m.isNew) {
      const t = setTimeout(() => setShimmer(false), 1700);
      return () => clearTimeout(t);
    }
  }, [m.isNew]);

  return (
    <div style={{
      display: 'flex', gap: '12px',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      animation: 'msgIn 0.38s cubic-bezier(0.34,1.56,0.64,1)',
    }}>

      {/* Avatar */}
      {isUser ? (
        <div style={{
          width: 32, height: 32, borderRadius: '10px', flexShrink: 0,
          background: 'rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: 700,
          marginTop: 2,
        }}>U</div>
      ) : (
        <div style={{
          width: 32, height: 32, borderRadius: '10px', flexShrink: 0,
          background: 'linear-gradient(135deg,#c4581e,#e07b3a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(196,88,30,0.3)', marginTop: 2,
        }}>
          <SparkSvg size={14} />
        </div>
      )}

      {/* Content column */}
      <div style={{
        flex: 1, maxWidth: isUser ? '75%' : '100%',
        display: 'flex', flexDirection: 'column', gap: '10px',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}>

        {/* Text bubble */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: isUser
            ? 'rgba(196,88,30,0.13)'
            : m.error ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isUser
            ? 'rgba(196,88,30,0.28)'
            : m.error ? 'rgba(239,68,68,0.22)' : 'rgba(255,255,255,0.07)'}`,
          borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
          padding: '13px 16px',
          fontSize: '14px', lineHeight: 1.75,
          color: isUser ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.82)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {renderText(m.text)}
          {shimmer && <div className="shimmer-sweep" />}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          paddingLeft: isUser ? 0 : 4, paddingRight: isUser ? 4 : 0,
        }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>{m.time}</span>
          {!isUser && onSpeak && (
            <button
              onClick={() => onSpeak(m.text)}
              title="Écouter la réponse"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 7px', borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.3)', fontSize: '10px',
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(196,88,30,0.1)'; e.currentTarget.style.color = '#e07b3a'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
            >
              <Volume2 size={11} /> Écouter
            </button>
          )}
        </div>

        {/* Data table + SQL */}
        {!isUser && (m.sql || (m.data?.length > 0)) && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {m.data?.length > 0 && (
              <div style={{
                position: 'relative', overflow: 'hidden',
                borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.02)',
              }}>
                {shimmer && <div className="shimmer-sweep shimmer-sweep--table" />}

                {/* Table header bar */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.025)',
                }}>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: 'rgba(255,255,255,0.38)',
                  }}>
                    <TableIcon size={12} />
                    {m.data.length} résultat{m.data.length > 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => exportToExcel(m.data, 'Export')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px',
                      background: 'rgba(196,88,30,0.1)', border: '1px solid rgba(196,88,30,0.22)',
                      borderRadius: '6px', color: '#e07b3a',
                      fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(196,88,30,0.22)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(196,88,30,0.1)'}
                  >
                    <FileSpreadsheet size={12} /> Exporter
                  </button>
                </div>

                {/* Table body */}
                <div style={{ overflowX: 'auto', maxHeight: '320px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', minWidth: '400px' }}>
                    <thead>
                      <tr>
                        {Object.keys(m.data[0]).map((k: string, ci: number) => (
                          <th key={k} style={{
                            padding: '10px 14px', textAlign: 'left',
                            fontSize: '10px', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.07em',
                            color: 'rgba(255,255,255,0.3)',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(255,255,255,0.02)',
                            position: 'sticky', top: 0, whiteSpace: 'nowrap',
                            animation: `staggerIn 0.3s ease-out ${ci * 0.04}s both`,
                          }}>
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {m.data.map((row: any, ri: number) => (
                        <tr key={ri}
                          style={{ transition: 'background 0.15s',
                            animation: `staggerIn 0.3s ease-out ${(ri + 1) * 0.05}s both` }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          {Object.keys(row).map((k: string) => (
                            <td key={k} style={{
                              padding: '10px 14px', color: 'rgba(255,255,255,0.65)',
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              maxWidth: '240px', overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {String(row[k] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SQL block */}
            {m.sql && (
              <div style={{ borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <button
                  onClick={() => onToggleSql(idx)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', padding: '9px 14px',
                    background: 'rgba(255,255,255,0.03)', border: 'none',
                    borderBottom: m.showSql ? '1px solid rgba(255,255,255,0.07)' : 'none',
                    cursor: 'pointer', color: 'rgba(255,255,255,0.3)',
                    fontSize: '11px', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Code size={12} /> Requête SQL générée
                  </span>
                  {m.showSql ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {m.showSql && (
                  <div style={{ position: 'relative' }}>
                    <pre style={{
                      padding: '14px 16px', background: '#080d18',
                      color: '#93c5fd',
                      fontFamily: '"JetBrains Mono","Fira Code",monospace',
                      fontSize: '12px', lineHeight: 1.7,
                      overflowX: 'auto', margin: 0,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      {m.sql}
                    </pre>
                    <button
                      onClick={() => onCopySql(m.sql, idx)}
                      style={{
                        position: 'absolute', top: 10, right: 10,
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 8px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px', color: 'rgba(255,255,255,0.5)',
                        fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'white'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                    >
                      {copied ? <><Check size={11} /> Copié</> : <><Copy size={11} /> Copier</>}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ChatIA() {
  const [messages, setMessages] = useState<any[]>([{
    id: 'init', role: 'bot', isNew: false,
    text: "Bonjour. Je suis **TranspoBot Analyst**, votre assistant IA connecté directement à la base de données MySQL.\n\nJe génère des requêtes SQL en temps réel pour analyser votre flotte, vos revenus et vos performances. Posez votre question en français naturel.",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    showSql: false,
  }]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [copiedIdx,   setCopiedIdx]   = useState<number | null>(null);
  const [aiState,     setAiState]     = useState<AiState>('idle');
  const [inputActive, setInputActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [autoSpeak,   setAutoSpeak]   = useState(false);
  const [hasStt,      setHasStt]      = useState(false);
  const [hasTts,      setHasTts]      = useState(false);
  const [statusMsg,   setStatusMsg]   = useState('');

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  const recognitionRef  = useRef<any>(null);
  const toast           = useToast();

  // ── Scroll to bottom ──────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Auto-resize textarea ──────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);


  // ── Speech Recognition setup ─────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      setHasStt(true);
      const r = new SR();
      r.lang = 'fr-FR';
      r.continuous = false;
      r.interimResults = true;
      r.onresult = (e: any) => {
        const transcript = Array.from(e.results as any[])
          .map((res: any) => res[0].transcript).join('');
        setInput(transcript);
      };
      r.onend = () => setIsListening(false);
      r.onerror = () => setIsListening(false);
      recognitionRef.current = r;
    }
    setHasTts(!!window.speechSynthesis);
  }, []);

  // ── Auto-speak new bot messages ───────────────────────
  useEffect(() => {
    if (!autoSpeak) return;
    const last = messages[messages.length - 1];
    if (last?.role === 'bot' && last.isNew) speakText(last.text);
  }, [messages, autoSpeak]);

  // ── Send message ──────────────────────────────────────
  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    const now     = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const history = messages
      .filter(m => m.role === 'user' || m.role === 'bot')
      .slice(-10)
      .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }));

    setMessages(p => [...p, { id: Date.now(), role: 'user', text: userMsg, time: now }]);
    setInput('');
    setLoading(true);
    setAiState('thinking');
    setStatusMsg('est en train d\'écrire…');

    try {
      const res = await fetchWithAuth('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg, history }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 100)}`);
      }

      const data = await res.json();
      const hasData = data.data?.length > 0;
      setAiState(hasData ? 'result' : 'idle');

      const id = Date.now() + 1;
      setMessages(p => [...p, {
        id, role: 'bot', isNew: true,
        text: data.answer, sql: data.sql, data: data.data,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        showSql: false,
      }]);
      setTimeout(() => {
        setMessages(p => p.map(m => m.id === id ? { ...m, isNew: false } : m));
        setAiState('idle');
      }, 1900);
    } catch (err: any) {
      setAiState('idle');
      const msg = err?.message || '';
      const display = msg.includes('401')
        ? "Session expirée. Reconnectez-vous."
        : msg.includes('429')
        ? "Trop de requêtes. Attendez un moment."
        : msg.includes('Failed to fetch') || msg.includes('NetworkError')
        ? "Backend inaccessible. Vérifiez qu'il est démarré."
        : `Erreur : ${msg.slice(0, 80) || "inconnue"}`;
      toast.error('Erreur IA', display);
      setMessages(p => [...p, {
        id: Date.now() + 1, role: 'bot', error: true, isNew: false,
        text: display,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  }

  function toggleSql(idx: number) {
    setMessages(p => p.map((m, i) => i === idx ? { ...m, showSql: !m.showSql } : m));
  }
  function copySql(sql: string, idx: number) {
    navigator.clipboard.writeText(sql);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }
  function clearChat() {
    if (confirm('Réinitialiser cette session ?')) {
      setMessages([messages[0]]);
      setAiState('idle');
    }
  }

  function speakText(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/\*\*/g, '').replace(/\n/g, ' ').trim();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'fr-FR'; u.rate = 1.0; u.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const fr = voices.find(v => v.lang.startsWith('fr'));
    if (fr) u.voice = fr;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }

  function toggleListening() {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      stopSpeaking();
      setInput('');
      try { recognitionRef.current.start(); setIsListening(true); } catch {}
    }
  }

  const suggestions = [
    { label: 'Combien de trajets cette semaine ?',           icon: <TrendingUp size={13} /> },
    { label: 'Quel chauffeur a le plus d\'incidents ?',      icon: <Users      size={13} /> },
    { label: 'Quels véhicules nécessitent une maintenance ?',icon: <Zap        size={13} /> },
    { label: 'Recettes par ligne',                           icon: <BarChart2  size={13} /> },
  ];

  // ── Render ────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - var(--topbar-h))',
      background: '#07090f', color: 'white',
      fontFamily: 'var(--font-sans)', overflow: 'hidden',
      position: 'relative',
    }}>

      {/* ─── HEADER ───────────────────────────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(7,9,15,0.88)',
        backdropFilter: 'blur(24px)',
        flexShrink: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <MorphingAvatar state={aiState} />
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em', color: 'white' }}>
              TranspoBot <span style={{ color: '#e07b3a' }}>Analyst</span>
            </div>
            <div style={{ fontSize: '11px', marginTop: 1 }}>
              {aiState === 'thinking' ? (
                <span style={{ color: '#f0a040', animation: 'textPulse 0.7s ease infinite' }}>
                  {statusMsg || 'est en train d\'écrire…'}
                </span>
              ) : aiState === 'result' ? (
                <span style={{ color: '#4ade80' }}>Résultats prêts ✓</span>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.32)' }}>Prêt · MySQL</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: '20px',
            background: 'rgba(16,185,129,0.07)',
            border: '1px solid rgba(16,185,129,0.14)',
            fontSize: '12px', fontWeight: 600,
            color: 'rgba(255,255,255,0.32)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#10b981', display: 'inline-block',
              animation: 'pulseLive 2s ease-in-out infinite',
            }} />
            <Database size={12} />
            MySQL
          </div>
          {/* Auto-speak toggle */}
          {hasTts && (
            <button
              onClick={() => { setAutoSpeak(v => !v); if (isSpeaking) stopSpeaking(); }}
              title={autoSpeak ? 'Désactiver la voix IA' : 'Activer la voix IA'}
              style={{
                width: 32, height: 32, borderRadius: '8px',
                border: `1px solid ${autoSpeak ? 'rgba(196,88,30,0.3)' : 'rgba(255,255,255,0.07)'}`,
                background: autoSpeak ? 'rgba(196,88,30,0.15)' : 'rgba(255,255,255,0.04)',
                color: autoSpeak ? '#e07b3a' : 'rgba(255,255,255,0.35)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(196,88,30,0.22)'; e.currentTarget.style.color = '#e07b3a'; }}
              onMouseLeave={e => { e.currentTarget.style.background = autoSpeak ? 'rgba(196,88,30,0.15)' : 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = autoSpeak ? '#e07b3a' : 'rgba(255,255,255,0.35)'; }}
            >
              {isSpeaking
                ? <Volume2 size={15} style={{ animation: 'textPulse 0.7s ease infinite' }} />
                : autoSpeak ? <Volume2 size={15} /> : <VolumeX size={15} />
              }
            </button>
          )}
          <button onClick={clearChat} title="Nouvelle session"
            style={{
              width: 32, height: 32, borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
              e.currentTarget.style.color = '#f87171';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </header>

      {/* ─── MESSAGES ─────────────────────────────────── */}
      <main id="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '32px 0 16px' }}>
        <div id="chat-inner" style={{
          maxWidth: '820px', margin: '0 auto', padding: '0 24px',
          display: 'flex', flexDirection: 'column', gap: '28px',
        }}>
          {messages.map((m, i) => (
            <MessageBubble
              key={m.id ?? i} m={m} idx={i}
              onToggleSql={toggleSql} onCopySql={copySql}
              copied={copiedIdx === i}
              onSpeak={hasTts ? speakText : undefined}
            />
          ))}

          {/* Loading indicator */}
          {loading && (
            <div style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              animation: 'msgIn 0.38s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              <MorphingAvatar state="thinking" size={32} />
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '4px 14px 14px 14px',
                padding: '14px 20px',
                display: 'flex', gap: 8, alignItems: 'center',
              }}>
                {[0, 0.15, 0.3].map((d, i) => (
                  <span key={i} style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#e07b3a', display: 'inline-block',
                    animation: `dotBlink 1.2s ease-in-out ${d}s infinite`,
                  }} />
                ))}
                {statusMsg && (
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginLeft: 4 }}>
                    {statusMsg}
                  </span>
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ─── INPUT AREA ───────────────────────────────── */}
      <footer style={{
        flexShrink: 0, padding: '16px 24px 24px',
        background: 'rgba(7,9,15,0.95)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(24px)', zIndex: 10,
      }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>

          {/* Suggestion pills — visibles quand le champ est vide */}
          <div style={{
            display: 'flex', gap: 8, marginBottom: 12,
            overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none',
            maxHeight: input.trim() === '' && !loading ? '40px' : '0px',
            opacity: input.trim() === '' && !loading ? 1 : 0,
            overflow: 'hidden',
            transition: 'max-height 0.25s ease, opacity 0.2s ease',
          }}>
            {suggestions.map((s, i) => (
              <RippleSuggestion key={i} label={s.label} icon={s.icon}
                onClick={() => { setInput(s.label); textareaRef.current?.focus(); }} />
            ))}
          </div>

          {/* ── Animated gradient border wrapper ── */}
          <div className={inputActive ? 'inp-wrap inp-wrap--on' : 'inp-wrap'}>
            <form
              onSubmit={handleSend}
              style={{
                display: 'flex', alignItems: 'flex-end', gap: 10,
                background: '#0b101a', borderRadius: '14px',
                padding: '12px 14px',
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                onFocus={() => setInputActive(true)}
                onBlur={() => setInputActive(false)}
                placeholder="Posez une question à TranspoBot…  (↵ Entrée pour envoyer)"
                rows={1}
                style={{
                  flex: 1, border: 'none', background: 'none', outline: 'none',
                  fontSize: '14px', color: 'white', resize: 'none',
                  fontFamily: 'inherit', lineHeight: 1.6,
                  maxHeight: '160px', overflowY: 'auto', paddingTop: 4,
                  transition: 'height 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                }}
              />
              {/* Microphone button */}
              {hasStt && (
                <button type="button" onClick={toggleListening} title={isListening ? 'Arrêter' : 'Dicter'}
                  style={{
                    width: 38, height: 38, borderRadius: '10px', border: 'none', flexShrink: 0,
                    background: isListening ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                    color: isListening ? '#f87171' : 'rgba(255,255,255,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.2s',
                    animation: isListening ? 'micPulse 1.2s ease-in-out infinite' : 'none',
                  }}
                  onMouseEnter={e => { if (!isListening) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; } }}
                  onMouseLeave={e => { if (!isListening) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; } }}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}

              <button type="submit" disabled={!input.trim() || loading}
                style={{
                  width: 38, height: 38, borderRadius: '10px',
                  border: 'none', flexShrink: 0,
                  background: input.trim() && !loading
                    ? 'linear-gradient(135deg,#c4581e,#e07b3a)' : 'rgba(255,255,255,0.06)',
                  color: input.trim() && !loading ? 'white' : 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  boxShadow: input.trim() && !loading ? '0 4px 16px rgba(196,88,30,0.35)' : 'none',
                  transform: input.trim() && !loading ? 'scale(1)' : 'scale(0.94)',
                  transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                }}
                onMouseEnter={e => {
                  if (input.trim() && !loading) {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 6px 22px rgba(196,88,30,0.55)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = input.trim() && !loading ? 'scale(1)' : 'scale(0.94)';
                  e.currentTarget.style.boxShadow = input.trim() && !loading
                    ? '0 4px 16px rgba(196,88,30,0.35)' : 'none';
                }}
              >
                <ArrowUp size={18} />
              </button>
            </form>
          </div>

        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: CHAT_STYLES }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function renderText(text: string) {
  if (!text) return null;
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} style={{ color: 'white', fontWeight: 700 }}>{p.slice(2, -2)}</strong>
      : p
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES  (all animations in one block — no runtime overhead)
// ─────────────────────────────────────────────────────────────────────────────
const CHAT_STYLES = `

/* ── Morphing Avatar blob ──────────────────────────── */
.av-blob {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 62% 38% 46% 54% / 60% 44% 56% 40%;
}
.av-blob--idle {
  background: linear-gradient(135deg, #c4581e 0%, #e07b3a 100%);
  box-shadow: 0 4px 18px rgba(196,88,30,0.45);
  animation: blobIdle 3.8s ease-in-out infinite;
}
.av-blob--thinking {
  background: linear-gradient(135deg, #f5b942 0%, #c4581e 60%, #8b2500 100%);
  box-shadow: 0 0 28px rgba(240,160,64,0.65);
  animation: blobThink 0.5s ease-in-out infinite;
}
.av-blob--result {
  background: linear-gradient(135deg, #00853F 0%, #4ade80 100%);
  box-shadow: 0 4px 22px rgba(0,133,63,0.55);
  animation: blobResult 2s ease-in-out infinite;
}

.av-glow {
  position: absolute; inset: -6px; border-radius: 50%;
  pointer-events: none; transition: opacity 0.5s ease;
}
.av-glow--idle    { opacity: 0; }
.av-glow--thinking {
  background: radial-gradient(circle, rgba(240,160,64,0.35) 0%, transparent 68%);
  opacity: 1; animation: glowPulse 0.55s ease-in-out infinite;
}
.av-glow--result {
  background: radial-gradient(circle, rgba(0,133,63,0.28) 0%, transparent 68%);
  opacity: 1;
}

@keyframes blobIdle {
  0%,100% { border-radius: 62% 38% 46% 54% / 60% 44% 56% 40%; }
  25%     { border-radius: 40% 60% 54% 46% / 48% 62% 38% 52%; }
  50%     { border-radius: 52% 48% 38% 62% / 40% 56% 44% 60%; }
  75%     { border-radius: 46% 54% 62% 38% / 56% 40% 60% 44%; }
}
@keyframes blobThink {
  0%  { border-radius:30% 70% 70% 30%/30% 30% 70% 70%; transform:scale(0.91) rotate(0deg); }
  25% { border-radius:70% 30% 30% 70%/70% 70% 30% 30%; transform:scale(1.07) rotate(50deg); }
  50% { border-radius:30% 70% 70% 30%/70% 30% 30% 70%; transform:scale(0.93) rotate(100deg); }
  75% { border-radius:70% 30% 30% 70%/30% 70% 70% 30%; transform:scale(1.05) rotate(150deg); }
  100%{ border-radius:30% 70% 70% 30%/30% 30% 70% 70%; transform:scale(0.91) rotate(200deg); }
}
@keyframes blobResult {
  0%,100%{ border-radius:52% 48% 46% 54%/50% 50% 50% 50%; transform:scale(1); }
  50%    { border-radius:46% 54% 52% 48%/54% 46% 54% 46%; transform:scale(1.05); }
}
@keyframes glowPulse {
  0%,100%{ transform:scale(1);   opacity:0.65; }
  50%    { transform:scale(1.35); opacity:1; }
}

/* ── Shimmer data-stream sweep ─────────────────────── */
.shimmer-sweep {
  position: absolute; inset: 0; pointer-events: none; z-index: 1;
  border-radius: inherit;
  background: linear-gradient(
    108deg,
    transparent 20%,
    rgba(255,255,255,0.055) 38%,
    rgba(196,88,30,0.09)   50%,
    rgba(255,255,255,0.055) 62%,
    transparent 80%
  );
  background-size: 220% 100%;
  animation: shimmerSweep 1.5s cubic-bezier(0.4,0,0.2,1) forwards;
}
.shimmer-sweep--table {
  background: linear-gradient(
    108deg,
    transparent 20%,
    rgba(0,133,63,0.07)  38%,
    rgba(255,255,255,0.05) 50%,
    rgba(0,133,63,0.05)  62%,
    transparent 80%
  );
  background-size: 220% 100%;
  animation: shimmerSweep 1.7s cubic-bezier(0.4,0,0.2,1) 0.18s forwards;
}
@keyframes shimmerSweep {
  0%  { background-position: 220% 0; opacity: 1; }
  75% { opacity: 1; }
  100%{ background-position: -110% 0; opacity: 0; }
}

/* ── Ripple wave on suggestions ────────────────────── */
.ripple-ring {
  position: absolute;
  transform: translate(-50%,-50%);
  width: 6px; height: 6px;
  background: rgba(196,88,30,0.45);
  border-radius: 50%;
  pointer-events: none;
  animation: rippleGrow 0.72s cubic-bezier(0.4,0,0.2,1) forwards;
}
@keyframes rippleGrow {
  0%  { width: 5px;   height: 5px;   opacity: 0.75; }
  100%{ width: 110px; height: 110px; opacity: 0; }
}

/* ── Animated conic-gradient border on input ───────── */
@property --ga {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
.inp-wrap {
  border-radius: 16px; padding: 1.5px;
  background: rgba(255,255,255,0.06);
  transition: box-shadow 0.3s ease;
}
.inp-wrap--on {
  background: conic-gradient(
    from var(--ga),
    #c4581e 0%, #e07b3a 18%, #f5b942 36%,
    #FDEF42 50%, #00853F 64%, #e07b3a 82%, #c4581e 100%
  );
  animation: rotGrad 2.8s linear infinite;
  box-shadow: 0 0 32px rgba(196,88,30,0.18), 0 0 64px rgba(0,133,63,0.08);
}
@keyframes rotGrad {
  from { --ga: 0deg; }
  to   { --ga: 360deg; }
}

/* ── Message entrance ──────────────────────────────── */
@keyframes msgIn {
  from { opacity:0; transform: translateY(14px) scale(0.97); }
  to   { opacity:1; transform: translateY(0)    scale(1); }
}

/* ── Table row stagger ─────────────────────────────── */
@keyframes staggerIn {
  from { opacity:0; transform:translateX(-10px); }
  to   { opacity:1; transform:translateX(0); }
}

/* ── Status text pulse ─────────────────────────────── */
@keyframes textPulse {
  0%,100%{ opacity:0.65; }
  50%    { opacity:1; }
}

/* ── Loading dots ──────────────────────────────────── */
@keyframes dotBlink {
  0%,80%,100%{ transform:scale(0.55); opacity:0.25; }
  40%        { transform:scale(1);    opacity:1; }
}

/* ── DB status live dot ────────────────────────────── */
@keyframes pulseLive {
  0%,100%{ box-shadow:0 0 5px rgba(16,185,129,0.6); }
  50%    { box-shadow:0 0 14px rgba(16,185,129,1); }
}

/* ── Mic pulsing glow ──────────────────────────────── */
@keyframes micPulse {
  0%,100%{ box-shadow:0 0 0 0 rgba(239,68,68,0);   background:rgba(239,68,68,0.20); }
  50%    { box-shadow:0 0 0 8px rgba(239,68,68,0);  background:rgba(239,68,68,0.38); }
}

/* ── Scrollbar ─────────────────────────────────────── */
#chat-scroll::-webkit-scrollbar       { width: 4px; }
#chat-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.07); border-radius:4px; }
textarea::placeholder { color:rgba(255,255,255,0.22)!important; font-size:13px; }
textarea::-webkit-scrollbar       { width:4px; }
textarea::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:4px; }
`;
