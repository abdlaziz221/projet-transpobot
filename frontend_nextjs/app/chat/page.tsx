/* eslint-disable */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { fetchWithAuth } from '../../lib/api';

const ChatIA = dynamic(() => import('../../components/ChatIA'), { ssr: false });

export default function ChatPage() {
  const router = useRouter();

  useEffect(() => {
    // Vérifie si l'utilisateur est connecté
    fetchWithAuth('/me').then(res => {
      if (!res.ok) {
        // Non connecté → redirige vers la page principale (login)
        router.replace('/');
      }
    }).catch(() => {
      router.replace('/');
    });
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 32px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'var(--card-bg)',
      }}>
        <a href="/" style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          ← Retour au dashboard
        </a>
        <span style={{ color: 'var(--border)' }}>|</span>
        <h1 style={{
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--text)',
          margin: 0,
        }}>
          🤖 Assistant IA TranspoBot
        </h1>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#c4581e',
          background: 'rgba(196,88,30,0.1)',
          padding: '2px 8px',
          borderRadius: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          Interface de Chat
        </span>
      </div>

      {/* Chat */}
      <div style={{ padding: '24px 32px' }}>
        <ChatIA />
      </div>
    </div>
  );
}
