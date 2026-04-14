/* eslint-disable */

'use client';
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(15, 23, 42, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="card animate-up" style={{
        width: '500px',
        maxWidth: '90%',
        padding: 0,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-xl)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-card)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{title}</h2>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'var(--bg-subtle)', 
              border: 'none', 
              cursor: 'pointer', 
              color: 'var(--text-muted)',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            className="hover-opacity"
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
