/* eslint-disable */

'use client';
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export default function Modal({ isOpen, onClose, title, children, width = '500px' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease-out',
        overflowY: 'auto',
        padding: '32px 16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card animate-up" style={{
        width,
        maxWidth: '95%',
        padding: 0,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-xl)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-card)',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              color: 'var(--text-main)',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-light)'; e.currentTarget.style.color = 'var(--danger)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-main)'; }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '24px', background: 'var(--bg-card)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
