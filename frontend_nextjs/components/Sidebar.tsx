/* eslint-disable */

import React from 'react';
import {
  LayoutDashboard, Bus, Users, Navigation, AlertTriangle,
  MessageSquare, LogOut, Wrench, Route, Tag,
  ChevronLeft, ChevronRight, Zap, Map
} from 'lucide-react';

export default function Sidebar({
  activePage,
  setActivePage,
  onLogout,
  incidentCount = 0,
  isCollapsed = false,
  toggleCollapse,
  isMobileOpen = false,
}: any) {
  const items = [
    { id: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'vehicules',   icon: Bus,             label: 'Véhicules' },
    { id: 'chauffeurs',  icon: Users,            label: 'Chauffeurs' },
    { id: 'trips',       icon: Navigation,       label: 'Trajets' },
    { id: 'lines',       icon: Route,            label: 'Lignes' },
    { id: 'fares',       icon: Tag,              label: 'Tarification' },
    { id: 'incidents',   icon: AlertTriangle,    label: 'Incidents' },
    { id: 'maintenance', icon: Wrench,           label: 'Maintenance' },
    { id: 'map',         icon: Map,              label: 'Carte Live' },
    { id: 'chat',        icon: MessageSquare,    label: 'AI Chat' },
  ];

  return (
    <aside
      className={typeof window !== 'undefined' && window.innerWidth <= 768
        ? (isMobileOpen ? 'sidebar-mobile-open' : 'sidebar-mobile-hidden')
        : ''
      }
      style={{
        width: isCollapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)',
        height: '100vh',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        position: 'fixed',
        left: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        transition: 'width var(--transition-base)',
        fontFamily: 'var(--font-sans)',
        boxShadow: 'var(--shadow-sm)',
      }}>

      {/* ── LOGO ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '22px 18px',
        borderBottom: '1px solid var(--subtle-border)',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}>
        <div style={{
          minWidth: '36px',
          height: '36px',
          background: 'linear-gradient(135deg, #c4581e, #e07b3a)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(196,88,30,0.4)',
          flexShrink: 0,
        }}>
          <Bus size={20} color="white" strokeWidth={2} />
        </div>
        {!isCollapsed && (
          <div>
            <span style={{
              fontSize: '17px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text-main)',
            }}>
              Transpo<span style={{ color: '#e07b3a' }}>Bot</span>
            </span>
            <div className="sidebar-subtle" style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginTop: '1px',
            }}>Sénégal 🇸🇳</div>
          </div>
        )}
      </div>

      {/* ── NAV ── */}
      <nav style={{
        flex: 1,
        padding: '12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {items.map(Item => {
          const isActive = activePage === Item.id;
          return (
            <button
              key={Item.id}
              onClick={() => setActivePage(Item.id)}
              title={isCollapsed ? Item.label : ''}
              className={`nav-item${isActive ? ' active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                padding: '10px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                border: 'none',
                textAlign: 'left',
                width: '100%',
                fontSize: '13.5px',
                fontWeight: isActive ? 700 : 500,
                position: 'relative',
              }}
            >
              <Item.icon
                size={18}
                strokeWidth={isActive ? 2.5 : 2}
                style={{ minWidth: '18px', flexShrink: 0 }}
              />
              {!isCollapsed && (
                <span style={{ transition: 'opacity 0.2s', flex: 1 }}>
                  {Item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── HELP CARD ── */}
      {!isCollapsed && (
        <div style={{ padding: '0 10px 10px' }}>
          <div style={{
            background: 'rgba(196,88,30,0.08)',
            border: '1px solid rgba(196,88,30,0.2)',
            borderRadius: '12px',
            padding: '14px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', right: '-8px', top: '-8px',
              opacity: 0.08, color: '#c4581e',
            }}>
              <Zap size={56} />
            </div>
            <p className="sidebar-title" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '3px' }}>
              Assistant IA
            </p>
            <p className="sidebar-subtle" style={{ fontSize: '11px', marginBottom: '10px', lineHeight: 1.4 }}>
              Analysez vos données en langage naturel.
            </p>
            <button
              onClick={() => setActivePage('chat')}
              style={{
                width: '100%',
                padding: '7px',
                background: 'linear-gradient(135deg, #c4581e, #e07b3a)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(196,88,30,0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(196,88,30,0.5)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(196,88,30,0.3)'}
            >
              <MessageSquare size={13} />
              Lancer l'IA
            </button>
          </div>
        </div>
      )}

      {/* ── COLLAPSE TOGGLE ── */}
      <button
        onClick={toggleCollapse}
        className="icon-btn"
        style={{
          margin: '0 10px 10px',
          padding: '8px',
          borderRadius: '10px',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 600,
          width: 'calc(100% - 20px)',
        }}
      >
        {isCollapsed
          ? <ChevronRight size={16} />
          : <><ChevronLeft size={16} /><span>Réduire</span></>
        }
      </button>

      {/* ── LOGOUT ── */}
      <div style={{
        padding: '0 10px 16px',
        borderTop: '1px solid var(--subtle-border)',
        paddingTop: '12px',
      }}>
        <button
          onClick={onLogout}
          className="logout-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '10px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: 600,
            width: '100%',
            transition: 'all 0.2s',
            color: 'var(--danger-500)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--danger-50)';
            e.currentTarget.style.color = 'var(--danger-600)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--danger-500)';
          }}
        >
          <LogOut size={18} />
          {!isCollapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
