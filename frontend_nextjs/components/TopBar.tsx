/* eslint-disable */

'use client';
import React, { useEffect, useState } from 'react';
import { Search, Bell, User, LogOut } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import toast from 'react-hot-toast';

export default function TopBar({ search, setSearch, onLogout }: any) {
  const [profile, setProfile] = useState<any>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    async function getProfile() {
        const res = await fetchWithAuth('/me');
        if (res.ok) setProfile(await res.json());
    }
    getProfile();

    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header style={{
      height: 'var(--topbar-h)',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{ position: 'relative', width: '400px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          placeholder="Rechercher partout..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px 10px 40px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontSize: '14px',
            outline: 'none'
          }}
        />
      </div>

      {/* DATE & HEURE */}
      <div style={{ marginLeft: '24px', fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
        {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* NOTIFICATIONS */}
        <button 
          onClick={() => toast.success("Vous avez 3 nouvelles alertes de maintenance.", { icon: '🔔' })}
          style={{ 
          background: 'none', 
          border: '1px solid var(--border)', 
          padding: '8px', 
          borderRadius: '10px', 
          cursor: 'pointer',
          position: 'relative'
        }}>
          <Bell size={20} color="var(--text-muted)" />
          <span style={{ 
            position: 'absolute', 
            top: '6px', 
            right: '6px', 
            width: '8px', 
            height: '8px', 
            background: 'var(--danger)', 
            borderRadius: '50%', 
            border: '2px solid var(--surface)' 
          }}></span>
        </button>

        {/* LOGOUT QUICK ACCESS */}
        <button 
          onClick={onLogout}
          className="logout-btn"
          title="Se déconnecter"
          style={{ 
            background: 'none', 
            border: '1px solid var(--border)', 
            padding: '8px', 
            borderRadius: '10px', 
            cursor: 'pointer',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
        >
          <LogOut size={20} />
        </button>

        {/* USER PROFILE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '20px', borderLeft: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>
                {profile?.username || 'Chargement...'}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {profile?.role || '...'}
            </p>
          </div>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
}
