/* eslint-disable */

'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { fetchWithAuth, BASE_URL } from '../lib/api';
import { Toaster } from 'react-hot-toast';

// Chargement Dynamique des composants pour optimiser le bundle initial
const Sidebar = dynamic(() => import('../components/Sidebar'), { ssr: false });
const TopBar = dynamic(() => import('../components/TopBar'), { ssr: false });
const DashboardOverview = dynamic(() => import('../components/DashboardOverview'), { ssr: false });
const VehiclesManagement = dynamic(() => import('../components/VehiclesManagement'), { ssr: false });
const DriversManagement = dynamic(() => import('../components/DriversManagement'), { ssr: false });
const TripsTracking = dynamic(() => import('../components/TripsTracking'), { ssr: false });
const IncidentsManagement = dynamic(() => import('../components/IncidentsManagement'), { ssr: false });
const MaintenanceManagement = dynamic(() => import('../components/MaintenanceManagement'), { ssr: false });
const ChatIA = dynamic(() => import('../components/ChatIA'), { ssr: false });
const LinesManagement = dynamic(() => import('../components/LinesManagement'), { ssr: false });
const FaresManagement = dynamic(() => import('../components/FaresManagement'), { ssr: false });

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activePage, setActivePage] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetchWithAuth('/me');
      if (res.ok) {
        setToken("authenticated"); 
        fetchStats();
      } else {
        setToken(null);
      }
    } catch (err) {
      setToken(null);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetchWithAuth('/stats');
      if (res.ok) setGlobalStats(await res.json());
    } catch (e) {}
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      const res = await fetch(`${BASE_URL}/login`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 
        body: formData,
        credentials: 'include' 
      });

      if (res.ok) {
         const data = await res.json();
         // HYBRIDE: On stocke en cookie (via le backend) ET en localstorage pour la robustesse
         if (data.access_token) {
            localStorage.setItem('token', data.access_token);
         }
         setToken("authenticated");
         fetchStats();
      } else {
         const data = await res.json().catch(() => ({}));
         alert(data.detail || "Identifiants incorrects ou service indisponible.");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Erreur réseau : Impossible de joindre le serveur. Vérifiez si Docker est lancé.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetchWithAuth('/logout', { method: 'POST' });
    localStorage.removeItem('token'); 
    setToken(null);
  };

  if (!token) {
     return (
       <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
          <div className="card animate-up" style={{ width: '400px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
             <div style={{ margin: '0 auto 24px', width: '56px', height: '56px', background: 'var(--primary)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
             </div>
             <h2 style={{ fontSize: '24px', fontWeight: 800 }}>TranspoBot Admin</h2>
             <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '14px' }}>Gestion de flotte professionnelle</p>
             <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div style={{ textAlign: 'left' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Utilisateur</label>
                    <input type="text" placeholder="admin" value={username} onChange={e => setUsername(e.target.value)} required style={{ width: '100%', marginTop: '4px' }} />
                 </div>
                 <div style={{ textAlign: 'left' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Mot de passe</label>
                    <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', marginTop: '4px' }} />
                 </div>
                                   <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={isLoading}
                    style={{ marginTop: '8px', padding: '14px', opacity: isLoading ? 0.7 : 1 }}
                  >
                    {isLoading ? 'Connexion en cours...' : 'Se connecter'}
                  </button>

             </form>
          </div>
       </div>
     );
  }

  return (
    <div className="app-container">
      <Sidebar 
          activePage={activePage} 
          setActivePage={setActivePage} 
          onLogout={handleLogout} 
          incidentCount={globalStats?.incidents_ouverts || 0}
      />
      
      <main className="main-content">
        <TopBar search={globalSearch} setSearch={setGlobalSearch} onLogout={handleLogout} />
        
        <div className="page-container">
          <header className="page-header">
             <h1>
               {activePage === 'dashboard' && 'Dashboard Overview'}
               {activePage === 'vehicules' && 'Gérer la Flotte'}
               {activePage === 'chauffeurs' && 'Base des Chauffeurs'}
               {activePage === 'trips' && 'Suivi des Trajets'}
               {activePage === 'incidents' && 'Gestion des Incidents'}
               {activePage === 'maintenance' && 'Maintenance du Parc'}
               {activePage === 'chat' && 'Assistant IA TranspoBot'}
             </h1>
             <p>
               {activePage === 'dashboard' && 'Vue d\'ensemble en temps réel de votre activité.'}
               {activePage === 'vehicules' && 'Consultez et gérez vos bus, minibus et taxis.'}
               {activePage === 'chauffeurs' && 'Suivi des performances et disponibilités de vos conducteurs.'}
               {activePage === 'trips' && 'Historique et surveillance des trajets en cours.'}
               {activePage === 'incidents' && 'Signalements techniques et sécurité de la flotte.'}
               {activePage === 'maintenance' && 'Planification et suivi des interventions mécaniques.'}
               {activePage === 'chat' && 'Interrogez vos données en langage naturel.'}
             </p>
          </header>

          <section>
            {activePage === 'dashboard' && <DashboardOverview setActivePage={setActivePage} />}
            {activePage === 'chat' && <ChatIA />}
            {activePage === 'vehicules' && <VehiclesManagement search={globalSearch} setSearch={setGlobalSearch} />}
            {activePage === 'chauffeurs' && <DriversManagement search={globalSearch} setSearch={setGlobalSearch} />}
            {activePage === 'trips' && <TripsTracking search={globalSearch} setSearch={setGlobalSearch} />}
            {activePage === 'lines' && <LinesManagement search={globalSearch} setSearch={setGlobalSearch} />}
            {activePage === 'fares' && <FaresManagement search={globalSearch} setSearch={setGlobalSearch} />}
            {activePage === 'incidents' && <IncidentsManagement search={globalSearch} setSearch={setGlobalSearch} />}
            {activePage === 'maintenance' && <MaintenanceManagement search={globalSearch} setSearch={setGlobalSearch} />}
          </section>
        </div>
      </main>
      <Toaster position="top-right" reverseOrder={false} />
    </div>
  );
}
