/* eslint-disable */

'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { fetchWithAuth } from '../lib/api';

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
const MapView         = dynamic(() => import('../components/MapView'),         { ssr: false });
const LoginPage       = dynamic(() => import('./login'), { ssr: false });

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    checkAuth();
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  const handleLogout = async () => {
    await fetchWithAuth('/logout', { method: 'POST' });
    localStorage.removeItem('token'); 
    setToken(null);
  };

  if (!token) {
     return <LoginPage onLoginSuccess={() => setToken('authenticated')} />;
  }

  return (
    <div className="app-container">
        <Sidebar
            activePage={activePage}
            setActivePage={(page: string) => {
              setActivePage(page);
              setIsMobileSidebarOpen(false);
            }}
            onLogout={handleLogout}
            incidentCount={globalStats?.incidents_ouverts || 0}
            isCollapsed={isSidebarCollapsed}
            toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isMobileOpen={isMobileSidebarOpen}
            onMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main className="main-content" style={{
            marginLeft: isMobile ? 0 : (isSidebarCollapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)'),
            transition: 'margin-left var(--transition-base)'
        }}>
          <TopBar
            search={globalSearch}
            setSearch={setGlobalSearch}
            onLogout={handleLogout}
            onMenuClick={undefined}
          />
          
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
                 {activePage === 'map'  && 'Carte Temps Réel — Sénégal'}
               </h1>
               <p>
                 {activePage === 'dashboard'   && 'Vue d\'ensemble en temps réel de votre activité.'}
                 {activePage === 'vehicules'   && 'Consultez et gérez vos bus, minibus et taxis.'}
                 {activePage === 'chauffeurs'  && 'Suivi des performances et disponibilités de vos conducteurs.'}
                 {activePage === 'trips'       && 'Historique et surveillance des trajets en cours.'}
                 {activePage === 'incidents'   && 'Signalements techniques et sécurité de la flotte.'}
                 {activePage === 'maintenance' && 'Planification et suivi des interventions mécaniques.'}
                 {activePage === 'chat'        && 'Interrogez vos données en langage naturel.'}
                 {activePage === 'map'         && 'Circulation en temps réel · Positions des véhicules · Incidents actifs'}
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
              {activePage === 'map'         && <MapView />}
            </section>
          </div>
        </main>
      </div>
  );
}
