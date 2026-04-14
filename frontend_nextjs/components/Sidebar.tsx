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
  Tag,
  ChevronLeft,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { Button } from './ui';

export default function Sidebar({ 
  activePage, 
  setActivePage, 
  onLogout, 
  incidentCount = 0,
  isCollapsed = false,
  toggleCollapse
}: any) {
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
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{
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
      transition: 'width var(--transition-base)'
    }}>
      {/* LOGO SECTION */}
      <div className="sidebar-logo" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        padding: '24px 20px', 
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }}>
        <div style={{ 
          minWidth: '36px', 
          height: '36px', 
          background: 'var(--gradient-primary)', 
          borderRadius: '10px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <Bus size={20} />
        </div>
        {!isCollapsed && (
            <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                Transpo<span style={{ color: 'var(--primary)' }}>Bot</span>
            </span>
        )}
      </div>
      
      {/* NAVIGATION */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', overflowX: 'hidden' }}>
        {items.map(Item => (
          <button 
            key={Item.id} 
            onClick={() => setActivePage(Item.id)}
            className={`sidebar-link ${activePage === Item.id ? 'active' : ''}`}
            title={isCollapsed ? Item.label : ''}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px 14px', 
              borderRadius: 'var(--radius-md)', 
              cursor: 'pointer',
              border: 'none',
              textAlign: 'left',
              width: '100%',
              fontSize: '14px',
              fontWeight: activePage === Item.id ? 600 : 500,
              transition: 'all var(--transition-fast)',
              background: activePage === Item.id ? 'var(--primary-light)' : 'transparent',
              color: activePage === Item.id ? 'var(--primary)' : 'var(--text-muted)',
              position: 'relative'
            }}
          >
            <Item.icon size={20} strokeWidth={activePage === Item.id ? 2.5 : 2} style={{ minWidth: '20px' }} />
            {!isCollapsed && <span style={{ transition: 'opacity 0.2s', opacity: 1 }}>{Item.label}</span>}
            
            {(Item.badge > 0) && (
              <span className="badge badge-danger badge-sm" style={{ 
                position: isCollapsed ? 'absolute' : 'static',
                top: isCollapsed ? '4px' : 'auto',
                right: isCollapsed ? '4px' : 'auto',
                marginLeft: isCollapsed ? 0 : 'auto',
                minWidth: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px'
              }}>
                {Item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
      
      {/* HELP CARD (only when not collapsed) */}
      {!isCollapsed && (
        <div style={{ padding: '16px 12px' }}>
          <div className="card" style={{ 
            background: 'var(--primary-light)', 
            padding: '16px', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--primary-100)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1, color: 'var(--primary)' }}>
                <MessageSquare size={60} />
            </div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>Besoin d'aide ?</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>L'IA analyse vos données en temps réel.</p>
            <Button 
              variant="primary" 
              size="sm"
              fullWidth
              onClick={() => setActivePage('chat')}
            >
              Lancer l'IA
            </Button>
          </div>
        </div>
      )}

      {/* COLLAPSE TOGGLE */}
      <button 
        onClick={toggleCollapse}
        style={{
            margin: '0 12px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-subtle)',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            transition: 'background 0.2s'
        }}
      >
        {isCollapsed ? <ChevronRight size={18} /> : <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ChevronLeft size={18} /><span style={{ fontSize: '12px', fontWeight: 600 }}>Réduire</span></div>}
      </button>

      {/* FOOTER / LOGOUT */}
      <div style={{ padding: '0 12px 16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        <button 
          onClick={onLogout} 
          className="btn-ghost"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '10px 14px', 
            borderRadius: 'var(--radius-md)', 
            color: 'var(--danger)', 
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            width: '100%',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            transition: 'all 0.2s'
          }}
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
