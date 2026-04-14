import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User, Code, Database, Table as TableIcon, 
  Sparkles, FileSpreadsheet, Trash2, Plus, Terminal, Zap, Info, ArrowUp
} from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { exportToExcel } from '../lib/excelUtils';
import { Button, Input, Badge } from './ui';
import { useToast } from './ui/Toast';

/**
 * COMPOSANT CHAT IA - VERSION PLATINUM 
 * Design inspiré par Claude.ai et Gemini
 */
export default function ChatIA() {
  const [messages, setMessages] = useState<any[]>([
    { 
        role: 'bot', 
        text: "Bonjour. Je suis TranspoBot, votre analyste stratégique. Je peux interroger directement la base MariaDB pour vous fournir des insights en temps réel sur votre flotte et vos revenus. Par quoi souhaitez-vous commencer ?",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        showSql: false
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Historique pour le backend
    const apiHistory = messages
      .filter(m => m.role === 'user' || m.role === 'bot')
      .slice(-10)
      .map(m => ({ 
          role: m.role === 'bot' ? 'assistant' : 'user', 
          content: m.text 
      }));

    setMessages(prev => [...prev, { role: 'user', text: userMsg, time: now }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetchWithAuth('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg, history: apiHistory })
      });
      const data = await res.json();
      
      const botMsg = { 
        role: 'bot', 
        text: data.answer, 
        sql: data.sql, 
        data: data.data,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        showSql: false
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
       toast.error("Erreur de connexion", "L'assistant n'a pas pu répondre.");
       setMessages(prev => [...prev, { 
         role: 'bot', 
         error: true, 
         text: "Désolé, je rencontre une difficulté pour me connecter au cerveau de l'IA. Vérifiez que le service Ollama est actif.",
         time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
       }]);
    } finally {
      setLoading(false);
    }
  }

  const clearChat = () => {
    if (confirm("Voulez-vous réinitialiser cette session d'analyse ?")) {
        setMessages([messages[0]]);
        toast.info("Session réinitialisée");
    }
  };

  const suggestions = [
    { label: "Recette par ligne", icon: <Zap size={14}/> },
    { label: "Véhicules en maintenance", icon: <Terminal size={14}/> },
    { label: "Chauffeurs performants", icon: <User size={14}/> }
  ];

  return (
    <div style={{ 
        display: 'flex', flexDirection: 'column', height: '100vh', 
        background: '#ffffff', color: '#1a1a1b', fontFamily: '"Inter", sans-serif',
        overflow: 'hidden' 
    }}>
        
        {/* HEADER TOP (FLOTTANT) */}
        <header style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
            padding: '16px 40px', borderBottom: '1px solid #f0f0f0', 
            background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', zIndex: 100 
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', background: '#000', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <Bot size={20} />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.5px' }}>TranspoBot <span style={{ color: '#999', fontWeight: 400 }}>Analyst Edition</span></h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#666' }}>
                    <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span> MariaDB Online
                </div>
                <button onClick={clearChat} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
                    <Trash2 size={18} />
                </button>
            </div>
        </header>

        {/* ZONE DE LECTURE (CHANCELLERIE) */}
        <main ref={scrollRef} style={{ flexGrow: 1, overflowY: 'auto', padding: '40px 0', scrollBehavior: 'smooth', width: '100%' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px', padding: '0 20px' }}>
                
                {messages.map((m, i) => (
                    <div key={i} style={{ 
                        display: 'flex', gap: '16px', 
                        flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                        animation: 'fadeInUp 0.4s ease-out',
                        alignItems: 'flex-start',
                        width: '100%'
                    }}>
                        {/* AVATAR RÉDUIT */}
                        <div style={{ 
                            width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                            background: m.role === 'user' ? '#f4f4f5' : '#111827',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: m.role === 'user' ? '#111827' : 'white',
                            marginTop: '6px'
                        }}>
                            {m.role === 'user' ? <User size={20}/> : <Sparkles size={18}/>}
                        </div>

                        {/* CONTENU */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', minWidth: 0 }}>
                            
                            {/* TEXTE */}
                            <div style={{ 
                                fontSize: '15.5px', 
                                lineHeight: '1.7', 
                                color: '#18181b', 
                                fontWeight: 400,
                                paddingLeft: '2px'
                            }}>
                                {m.text}
                            </div>

                            {/* EXTRAS (SQL & DATA) */}
                            {m.role === 'bot' && (m.sql || m.data) && (
                                <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '24px', 
                                    marginTop: '8px', 
                                    width: '100%',
                                    borderLeft: '2px solid #f4f4f5',
                                    paddingLeft: '24px' 
                                }}>
                                    
                                    {/* TABLEAU DE DONNEES */}
                                    {m.data && m.data.length > 0 && (
                                        <div style={{ 
                                            overflow: 'hidden', 
                                            border: '1px solid #e5e7eb', 
                                            borderRadius: '12px', 
                                            width: '100%',
                                            background: 'white',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                                        }}>
                                            <div style={{ 
                                                padding: '12px 16px', 
                                                background: '#f9fafb', 
                                                borderBottom: '1px solid #e5e7eb', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'space-between' 
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    <TableIcon size={14} /> Extraction des données métiers
                                                </div>
                                                <button 
                                                    style={{ 
                                                        background: '#ffffff', 
                                                        border: '1px solid #e5e7eb', 
                                                        color: '#4b5563', 
                                                        cursor: 'pointer', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '6px', 
                                                        fontSize: '12px', 
                                                        fontWeight: 600,
                                                        padding: '6px 12px',
                                                        borderRadius: '8px'
                                                    }}
                                                    onClick={() => exportToExcel(m.data, 'Export')}
                                                >
                                                    <FileSpreadsheet size={14}/> CSV
                                                </button>
                                            </div>
                                            <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
                                                <table style={{ fontSize: '13px', borderCollapse: 'collapse', width: '100%', textAlign: 'left', minWidth: '400px' }}>
                                                    <thead style={{ background: '#fdfdfd', position: 'sticky', top: 0, zIndex: 1 }}>
                                                        <tr>{Object.keys(m.data[0]).map(k => (
                                                            <th key={k} style={{ 
                                                                padding: '12px 16px', 
                                                                color: '#111827', 
                                                                fontWeight: 600, 
                                                                borderBottom: '2px solid #f3f4f6',
                                                                fontSize: '12px'
                                                            }}>{k}</th>
                                                        ))}</tr>
                                                    </thead>
                                                    <tbody>
                                                        {m.data.map((row: any, idx: number) => (
                                                            <tr key={`row-${idx}`} style={{ transition: 'background 0.2s' }}>
                                                                {Object.keys(row).map(k => (
                                                                    <td key={`cell-${idx}-${k}`} style={{ 
                                                                        padding: '12px 16px', 
                                                                        color: '#4b5563', 
                                                                        borderBottom: '1px solid #f3f4f6' 
                                                                    }}>
                                                                        {String(row[k] ?? '')}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* SQL BLOCK (TOUJOURS VISIBLE) */}
                                    {m.sql && (
                                        <div style={{ 
                                            marginTop: '4px',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{ padding: '8px 12px', background: '#f9fafb', fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #e5e7eb' }}>
                                                <Code size={13}/> Requête MariaDB exécutée
                                            </div>
                                            <div style={{ 
                                                padding: '12px', background: '#111827', color: '#e5e7eb', 
                                                fontFamily: '"JetBrains Mono", monospace', fontSize: '12.5px',
                                                overflowX: 'auto',
                                                whiteSpace: 'pre-wrap'
                                            }}>
                                                {m.sql}
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}

                        </div>
                    </div>
                ))}

                {/* LOADING SKELETON */}
                {loading && (
                    <div style={{ display: 'flex', gap: '24px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={18} color="#e4e4e7" className="animate-pulse" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                            <div style={{ height: '14px', width: '80%', background: '#f4f4f5', borderRadius: '4px' }}></div>
                            <div style={{ height: '14px', width: '40%', background: '#f4f4f5', borderRadius: '4px' }}></div>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>
        </main>

        {/* INPUT STICKY BAR (PARFAITEMENT SYMÉTRIQUE) */}
        <div style={{ 
            flexShrink: 0, 
            padding: '24px 0 40px 0', 
            background: 'white',
            borderTop: '1px solid #f4f4f5',
            zIndex: 100,
            width: '100%'
        }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', padding: '0 20px' }}>
                
                {/* SUGGESTIONS CHIPS */}
                {!loading && messages.length < 3 && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                        {suggestions.map((s, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => setInput(s.label)}
                                style={{ 
                                    padding: '8px 16px', borderRadius: '20px', border: '1px solid #e4e4e7', 
                                    background: 'white', color: '#3f3f46', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                                    cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500, whiteSpace: 'nowrap'
                                }}
                                onMouseOver={e => e.currentTarget.style.borderColor = '#000'}
                                onMouseOut={e => e.currentTarget.style.borderColor = '#e4e4e7'}
                            >
                                {s.icon} {s.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* FORM */}
                <form 
                    onSubmit={handleSend}
                    style={{ 
                        position: 'relative', background: 'white', border: '1px solid #e4e4e7', 
                        borderRadius: '16px', padding: '12px 16px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                        display: 'flex', alignItems: 'center', gap: '12px'
                    }}
                >
                    <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend(e);
                            }
                        }}
                        placeholder="Posez une question à TranspoBot..."
                        rows={1}
                        style={{ 
                            flexGrow: 1, border: 'none', background: 'none', outline: 'none',
                            fontSize: '16px', resize: 'none', padding: '10px 0', fontFamily: 'inherit'
                        }}
                    />
                    <button 
                        disabled={!input.trim() || loading}
                        style={{ 
                            width: '40px', height: '40px', borderRadius: '10px', border: 'none',
                            background: input.trim() ? '#111827' : '#f4f4f5', 
                            color: input.trim() ? 'white' : '#a1a1aa',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <ArrowUp size={20} />
                    </button>
                </form>
                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                    <p style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 500 }}>
                        TranspoBot v2.0 • Analyse sémantique basée sur MariaDB • Sénégal
                    </p>
                </div>
            </div>
        </div>

        {/* CSS ANIMATIONS */}
        <style dangerouslySetInnerHTML={{ __html: `
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-pulse {
                animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: .5; }
            }
        `}} />
    </div>
  );
}
