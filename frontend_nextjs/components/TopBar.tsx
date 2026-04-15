/* eslint-disable */

import React, { useEffect, useState } from 'react';
import { Search, Bell, User, LogOut, Sun, Moon, Settings, Menu } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { useToast } from './ui/Toast';
import { useTheme } from '../context/ThemeContext';

export default function TopBar({ search, setSearch, onLogout, onMenuClick }: any) {
  const [profile, setProfile] = useState<any>(null);
  const [now, setNow] = useState(new Date());
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    async function getProfile() {
      try {
        const res = await fetchWithAuth('/me');
        if (res.ok) setProfile(await res.json());
      } catch (e) {}
    }
    getProfile();
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const initials = profile?.username
    ? profile.username.slice(0, 2).toUpperCase()
    : '—';

  return (
    <header style={{
      height: 'var(--topbar-h)',
      background: 'var(--bg)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      gap: '12px',
      fontFamily: 'var(--font-sans)',
      boxShadow: 'var(--shadow-sm)',
    }}>

      {/* ── HAMBURGER (mobile only) ── */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          style={{
            display: 'none',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg-subtle)',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-main)',
            flexShrink: 0,
          }}
          className="mobile-menu-btn"
        >
          <Menu size={18} />
        </button>
      )}

      {/* ── SEARCH ── */}
      <div className="topbar-search" style={{
        position: 'relative',
        width: '280px',
        flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute',
          left: '13px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
        }}>
          <Search size={16} />
        </span>
        <input
          type="text"
          placeholder="Rechercher partout…"
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '9px 14px 9px 38px',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontSize: '13px',
            color: 'var(--text-main)',
            outline: 'none',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--border-focus)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-100)';
            e.currentTarget.style.background = 'var(--surface)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.background = 'var(--bg-subtle)';
          }}
        />
      </div>

      {/* ── DATE ── */}
      <div className="topbar-date" style={{
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'capitalize',
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border)',
        padding: '6px 12px',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        whiteSpace: 'nowrap',
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          background: 'var(--primary)',
          borderRadius: '50%',
          boxShadow: 'var(--shadow-glow)',
        }} />
        {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>

      <div style={{
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>

        {/* ── ICON BUTTONS ── */}
        <div style={{
          display: 'flex',
          gap: '4px',
          paddingRight: '12px',
          borderRight: '1px solid var(--border)',
        }}>
          <TopBarIconBtn
            title="Notifications"
            onClick={() => toast.info('Notifications', 'Vous avez 3 nouvelles alertes de maintenance.')}
          >
            <Bell size={17} />
            <span style={{
              position: 'absolute',
              top: '7px',
              right: '7px',
              width: '7px',
              height: '7px',
              background: 'var(--danger)',
              borderRadius: '50%',
              border: '1.5px solid var(--bg)',
            }} />
          </TopBarIconBtn>

          <TopBarIconBtn
            title={`Mode ${theme === 'light' ? 'sombre' : 'clair'}`}
            onClick={toggleTheme}
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </TopBarIconBtn>

          <TopBarIconBtn
            title="Paramètres"
            onClick={() => toast.info('Paramètres', 'Configuration système')}
          >
            <Settings size={17} />
          </TopBarIconBtn>
        </div>

        {/* ── USER PROFILE ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '4px' }}>
          <div className="topbar-username" style={{ textAlign: 'right' }}>
            <p style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-main)',
              lineHeight: 1.2,
            }}>
              {profile?.username || '…'}
            </p>
            <p style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: '0.06em',
              marginTop: '2px',
            }}>
              {profile?.role || '…'}
            </p>
          </div>

          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #c4581e, #e07b3a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: '13px',
            boxShadow: '0 4px 12px rgba(196,88,30,0.35)',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            letterSpacing: '0.02em',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.06)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(196,88,30,0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(196,88,30,0.35)';
            }}
          >
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}

function TopBarIconBtn({ children, onClick, title }: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '34px',
        height: '34px',
        borderRadius: '8px',
        border: '1px solid var(--overlay-border)',
        background: 'var(--overlay-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--icon-color)',
        transition: 'all 0.2s',
        position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--overlay-bg-hover)';
        e.currentTarget.style.color = 'var(--icon-color-hover)';
        e.currentTarget.style.borderColor = 'var(--overlay-border-hover)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--overlay-bg)';
        e.currentTarget.style.color = 'var(--icon-color)';
        e.currentTarget.style.borderColor = 'var(--overlay-border)';
      }}
    >
      {children}
    </button>
  );
}
