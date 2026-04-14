import React, { useEffect, useState } from 'react';
import { Search, Bell, User, LogOut, Sun, Moon, Settings } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { useToast } from './ui/Toast';
import { Button, Input } from './ui';
import { useTheme } from '../context/ThemeContext';

export default function TopBar({ search, setSearch, onLogout }: any) {
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

  return (
    <header className="topbar" style={{
      height: 'var(--topbar-h)',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: 'var(--shadow-xs)'
    }}>
      {/* SEARCH SECTION */}
      <div style={{ position: 'relative', width: '400px' }}>
        <Input
          type="text"
          placeholder="Rechercher partout..."
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          leftIcon={<Search size={18} />}
          size="md"
        />
      </div>

      {/* DATE & HEURE (Hidden on small screens) */}
      <div style={{ 
        marginLeft: '24px', 
        fontSize: '13px', 
        fontWeight: 600, 
        color: 'var(--text-muted)', 
        textTransform: 'capitalize',
        background: 'var(--bg-subtle)',
        padding: '6px 12px',
        borderRadius: 'var(--radius-full)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%' }}></div>
        {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        
        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: '8px', paddingRight: '12px', borderRight: '1px solid var(--border)' }}>
            <button 
                className="icon-btn"
                title="Notifications"
                onClick={() => toast.info("Notifications", "Vous avez 3 nouvelles alertes de maintenance.")}
                style={{ position: 'relative' }}
            >
                <Bell size={20} />
                <span style={{ 
                    position: 'absolute', 
                    top: '6px', 
                    right: '6px', 
                    width: '8px', 
                    height: '8px', 
                    background: 'var(--danger)', 
                    borderRadius: '50%', 
                    border: '2px solid var(--surface)',
                    boxShadow: '0 0 0 2px var(--surface)'
                }}></span>
            </button>

            <button 
                className="icon-btn"
                title={`Passer en mode ${theme === 'light' ? 'sombre' : 'clair'}`}
                onClick={toggleTheme}
            >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <button 
                className="icon-btn"
                title="Paramètres"
                onClick={() => toast.info("Paramètres", "Configuration système")}
            >
                <Settings size={20} />
            </button>
        </div>

        {/* USER PROFILE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '8px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                {profile?.username || 'Chargement...'}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginTop: '2px' }}>
                {profile?.role || '...'}
            </p>
          </div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '12px', 
            background: 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: 'var(--shadow-md)',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <User size={22} />
          </div>
        </div>
      </div>
    </header>
  );
}
