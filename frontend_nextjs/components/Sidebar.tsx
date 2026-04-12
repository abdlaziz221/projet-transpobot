/* eslint-disable */

import React from 'react';
import {
  LayoutDashboard,
  Bus,
  Users,
  Navigation,
  AlertTriangle,
  MessageSquare,
  LogOut,
  Wrench,
  Route,
  Tag
} from 'lucide-react';

export default function Sidebar({ activePage, setActivePage, onLogout, incidentCount = 0 }: any) {
  const items = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'vehicules', icon: Bus, label: 'Véhicules' },
    { id: 'chauffeurs', icon: Users, label: 'Chauffeurs' },
    { id: 'trips', icon: Navigation, label: 'Trajets' },
    { id: 'lines', icon: Route, label: 'Lignes' },
    { id: 'fares', icon: Tag, label: 'Tarification' },
    { id: 'incidents', icon: AlertTriangle, label: 'Incidents', badge: incidentCount },
    { id: 'maintenance', icon: Wrench, label: 'Maintenance' },
    { id: 'chat', icon: MessageSquare, label: 'AI Chat' },
  ];

  return (
    <aside className="sidebar" style={{
      width: 'var(--sidebar-w)', 
      height: '100vh', 
      background: 'var(--surface)', 
      borderRight: '1px solid var(--border)',
      position: 'fixed', 
      left: 0, 
      top: 0,
      display: 'flex', 
      flexDirection: 'column',
      zIndex: 100
    }}>
      {/* LOGO SECTION */}
      <div className="sidebar-logo" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        padding: '24px 20px', 
        borderBottom: '1px solid var(--border)' 
      }}>
        <div style={{ 
          width: '36px', 
          height: '36px', 
          background: 'var(--primary)', 
          borderRadius: '10px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white'
        }}>
          <Bus size={20} />
        </div>
        <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>TranspoBot</span>
      </div>
      
      {/* NAVIGATION */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {items.map(Item => (
          <button 
            key={Item.id} 
            onClick={() => setActivePage(Item.id)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px 14px', 
              borderRadius: '8px', 
              cursor: 'pointer',
              border: 'none',
              textAlign: 'left',
              width: '100%',
              fontSize: '14px',
              fontWeight: activePage === Item.id ? 600 : 500,
              transition: 'all 0.2s',
              background: activePage === Item.id ? 'var(--primary-light)' : 'transparent',
              color: activePage === Item.id ? 'var(--primary)' : 'var(--text-muted)'
            }}
            className={activePage === Item.id ? 'active' : ''}
          >
            <Item.icon size={18} strokeWidth={activePage === Item.id ? 2.5 : 2} />
            <span style={{ flex: 1 }}>{Item.label}</span>
            {Item.badge > 0 && (
              <span style={{ 
                background: 'var(--danger)', 
                color: 'white', 
                fontSize: '10px', 
                padding: '2px 6px', 
                borderRadius: '10px',
                fontWeight: 700
              }}>
                {Item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
      
      {/* HELP CARD */}
      <div style={{ padding: '16px 12px' }}>
        <div style={{ 
          background: 'var(--primary-light)', 
          padding: '16px', 
          borderRadius: 'var(--radius)', 
          border: '1px solid #bfdbfe' 
        }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>Besoin d'aide ?</p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>Interrogez notre assistant IA pour analyser vos données.</p>
          <button 
            onClick={() => setActivePage('chat')}
            style={{ 
              width: '100%', 
              background: 'var(--primary)', 
              color: 'white', 
              border: 'none', 
              padding: '8px', 
              borderRadius: '6px', 
              fontSize: '12px', 
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Ouvrir l'IA
          </button>
        </div>
      </div>

      {/* FOOTER / LOGOUT */}
      <button 
        onClick={onLogout} 
        style={{ 
          margin: '0 12px 16px',
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          padding: '12px 14px', 
          borderRadius: '8px', 
          color: 'var(--danger)', 
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
          borderTop: '1px solid var(--border)',
          width: 'calc(100% - 24px)'
        }}
      >
        <LogOut size={18} />
        <span>Déconnexion</span>
      </button>
    </aside>
  );
}
