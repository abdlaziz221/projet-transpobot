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
  toggleCollapse
}: any) {
  const items = [
    { id: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'vehicules',   icon: Bus,             label: 'Véhicules' },
    { id: 'chauffeurs',  icon: Users,            label: 'Chauffeurs' },
    { id: 'trips',       icon: Navigation,       label: 'Trajets' },
    { id: 'lines',       icon: Route,            label: 'Lignes' },
    { id: 'fares',       icon: Tag,              label: 'Tarification' },
    { id: 'incidents',   icon: AlertTriangle,    label: 'Incidents', badge: incidentCount },
    { id: 'maintenance', icon: Wrench,           label: 'Maintenance' },
    { id: 'map',         icon: Map,              label: 'Carte Live' },
    { id: 'chat',        icon: MessageSquare,    label: 'AI Chat' },
  ];

  return (
    <aside style={{
      width: isCollapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)',
      height: '100vh',
      background: 'var(--bg)',
      borderRight: '1px solid var(--border)',
      position: window?.innerWidth < 768 ? 'fixed' : 'fixed',
      left: window?.innerWidth < 768 && !isCollapsed ? '-100%' : '0',
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      transition: 'width var(--transition-base), left var(--transition-base)',
      fontFamily: 'var(--font-sans)',
      boxShadow: window?.innerWidth < 768 ? 'var(--shadow-lg)' : 'none',
    }}>

      {/* ── LOGO ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '22px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
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
              color: 'white',
            }}>
              Transpo<span style={{ color: '#e07b3a' }}>Bot</span>
            </span>
            <div style={{
              fontSize: '9px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.3)',
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
                transition: 'all 0.15s ease',
                background: isActive
                  ? 'rgba(196,88,30,0.15)'
                  : 'transparent',
                color: isActive
                  ? '#e07b3a'
                  : 'rgba(255,255,255,0.45)',
                position: 'relative',
                borderLeft: isActive
                  ? '2px solid #c4581e'
                  : '2px solid transparent',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                }
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
              {(Item.badge > 0) && (
                <span style={{
                  position: isCollapsed ? 'absolute' : 'static',
                  top: isCollapsed ? '4px' : 'auto',
                  right: isCollapsed ? '4px' : 'auto',
                  marginLeft: isCollapsed ? 0 : 'auto',
                  minWidth: '18px',
                  height: '18px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '9px',
                  fontSize: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  {Item.badge}
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
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginBottom: '3px' }}>
              Assistant IA
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px', lineHeight: 1.4 }}>
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
        style={{
          margin: '0 10px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.35)',
          transition: 'all 0.2s',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 600,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
          e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
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
        borderTop: '1px solid rgba(255,255,255,0.05)',
        paddingTop: '12px',
      }}>
        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '10px',
            color: 'rgba(239,68,68,0.7)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: 600,
            width: '100%',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
            e.currentTarget.style.color = '#f87171';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(239,68,68,0.7)';
          }}
        >
          <LogOut size={18} />
          {!isCollapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
