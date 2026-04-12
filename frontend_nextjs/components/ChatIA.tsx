/* eslint-disable */
'use client';
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Code, 
  Database, 
  Table as TableIcon, 
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { exportToExcel } from '../lib/excelUtils';

export default function ChatIA() {
  const [messages, setMessages] = useState<any[]>([
    { 
        role: 'bot', 
        text: "Bonjour ! Je suis l'assistant TranspoBot. Je peux analyser vos trajets, véhicules, incidents et plus encore. Que souhaitez-vous savoir ?",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        showSql: false
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSQLGlobal, setShowSQLGlobal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Garder le contexte (historique) : Max 10 messages pour ne pas surcharger
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
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: data.answer, 
        sql: data.sql, 
        data: data.data,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        showSql: false
      }]);
    } catch (err) {
       setMessages(prev => [...prev, { 
         role: 'bot', 
         error: true, 
         text: "Désolé, je rencontre une difficulté technique pour accéder aux données.",
         time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
       }]);
    } finally {
      setLoading(false);
    }
  }

  const toggleLocalSQL = (idx: number) => {
    setMessages(prev => prev.map((m, i) => i === idx ? { ...m, showSql: !m.showSql } : m));
  };

  const suggestions = [
    "Combien de trajets aujourd'hui ?",
    "Quels véhicules sont en maintenance ?",
    "Chauffeur avec le plus d'incidents ?",
    "Recette totale cette semaine"
  ];

  return (
    <div className="animate-up" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', padding: 0, overflow: 'hidden' }}>
        
        {/* CHAT HEADER */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--primary), #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <Bot size={22} />
                </div>
                <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Assistant IA TranspoBot</h3>
                    <p style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>● Système d'analyse en ligne</p>
                </div>
            </div>
            <button 
                onClick={() => setShowSQLGlobal(!showSQLGlobal)}
                style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', 
                    borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                }}
                className={showSQLGlobal ? 'btn-primary' : ''}
            >
                <Code size={14} /> {showSQLGlobal ? 'Masquer tout le SQL' : 'Afficher tout le SQL'}
            </button>
        </div>

        {/* MESSAGES ZONE */}
        <div 
            ref={scrollRef}
            style={{ flex: 1, padding: '24px', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
            {messages.map((m, i) => (
                <div key={i} style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start'
                }}>
                    <div style={{ display: 'flex', gap: '10px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                        <div style={{ 
                            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                            background: m.role === 'user' ? 'white' : 'linear-gradient(135deg, var(--primary), #7c3aed)',
                            color: m.role === 'user' ? 'var(--text-muted)' : 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: m.role === 'user' ? '1px solid var(--border)' : 'none',
                            fontSize: '10px', fontWeight: 700
                        }}>
                           {m.role === 'user' ? <User size={16}/> : <Bot size={16}/>}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ 
                                padding: '12px 16px', 
                                borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                                background: m.role === 'user' ? 'var(--primary)' : 'white',
                                color: m.role === 'user' ? 'white' : 'var(--text-main)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                                fontSize: '14px',
                                lineHeight: '1.5'
                            }}>
                                {m.text}
                            </div>
                            
                            {m.role === 'bot' && m.sql && (
                                <button 
                                    onClick={() => toggleLocalSQL(i)}
                                    style={{ 
                                        background: 'transparent', border: 'none', color: 'var(--primary)', 
                                        fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px',
                                        cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-start'
                                    }}
                                >
                                    <Code size={12}/> {m.showSql || showSQLGlobal ? 'Masquer la requête SQL' : 'Voir la requête SQL'}
                                </button>
                            )}

                            {m.role === 'bot' && (m.sql || m.data) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                                    {(m.showSql || showSQLGlobal) && m.sql && (
                                        <div style={{ 
                                            background: '#0f172a', color: '#4ade80', padding: '12px', 
                                            borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px',
                                            border: '1px solid #1e2937'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                                                <Database size={12}/> Requête SQL Générée
                                            </div>
                                            {m.sql}
                                        </div>
                                    )}

                                    {m.data && m.data.length > 0 && (
                                        <div style={{ 
                                            background: 'white', border: '1px solid var(--border)', 
                                            borderRadius: '8px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' 
                                        }}>
                                            <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <TableIcon size={14}/> Résultats ({m.data.length})
                                                </div>
                                                <button 
                                                    onClick={() => exportToExcel(m.data, 'Export_Analyse_TranspoBot')}
                                                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}
                                                >
                                                    <FileSpreadsheet size={12}/> Exporter XLSX
                                                </button>
                                            </div>
                                            <div style={{ overflowX: 'auto', maxHeight: '200px' }}>
                                                <table style={{ fontSize: '12px', border: 'none' }}>
                                                    <thead style={{ background: '#f8fafc' }}>
                                                        <tr>{Object.keys(m.data[0]).map(k => <th key={k} style={{ padding: '8px 12px', textAlign: 'left' }}>{k}</th>)}</tr>
                                                    </thead>
                                                    <tbody style={{ background: 'white' }}>
                                                        {m.data.map((row: any, idx: number) => (
                                                            <tr key={`row-${idx}`} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                                {Object.keys(row).map(k => (
                                                                    <td key={`cell-${idx}-${k}`} style={{ padding: '8px 12px' }}>
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
                                </div>
                            )}
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: m.role === 'user' ? 'right' : 'left' }}>{m.time}</span>
                        </div>
                    </div>
                </div>
            ))}
            {loading && (
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Sparkles size={16} className="animate-pulse" />
                    </div>
                    <div style={{ background: 'white', padding: '12px 16px', borderRadius: '4px 16px 16px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        TranspoBot analyse votre demande...
                    </div>
                </div>
            )}
        </div>

        {/* INPUT AREA */}
        <div style={{ padding: '20px 24px', background: 'white', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                {suggestions.map(s => (
                    <button 
                        key={s} 
                        onClick={() => setInput(s)}
                        style={{ 
                            whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: '99px', 
                            border: '1px solid var(--border)', background: 'white', 
                            fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e:any) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                        onMouseOut={(e:any) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                        {s}
                    </button>
                ))}
            </div>
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px' }}>
                <input 
                    type="text" 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    placeholder="Posez une question sur la flotte, les revenus ou les incidents..." 
                    style={{ 
                        flex: 1, padding: '12px 16px', borderRadius: '10px', 
                        border: '1px solid var(--border)', background: '#f8fafc',
                        outline: 'none', fontSize: '14px'
                    }}
                />
                <button type="submit" className="btn-primary" style={{ height: '45px', width: '45px', padding: 0, borderRadius: '10px' }}>
                    <Send size={18} />
                </button>
            </form>
            <p style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', marginTop: '12px' }}>
                L'IA générative peut faire des erreurs. Vérifiez les informations critiques.
            </p>
        </div>
      </div>
    </div>
  );
}
