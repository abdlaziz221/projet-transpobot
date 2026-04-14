import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
    Bus, Users, Navigation, TrendingUp, Coins, Wrench,
    ArrowUpRight, ArrowDownRight, Loader2, AlertTriangle, ChevronRight,
    Map
} from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { Card, Button, Badge, Skeleton } from './ui';
import Sparkline from './ui/Sparkline';

const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });
const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false });
const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });

import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

export default function DashboardOverview({ setActivePage }: any) {
    const [stats, setStats] = useState<any>(null);
    const [weeklyData, setWeeklyData] = useState<any[]>([]);
    const [vehicleStatus, setVehicleStatus] = useState<any[]>([]);
    const [revenueByLine, setRevenueByLine] = useState<any[]>([]);
    const [maintenanceAlerts, setMaintenanceAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartsReady, setChartsReady] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && !chartsReady) {
            ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,
                BarElement, ArcElement, Title, Tooltip, Legend, Filler);
            setChartsReady(true);
        }
        loadDashboard();
    }, []);

    async function loadDashboard() {
        try {
            const [sRes, wRes, vRes, rRes, mRes] = await Promise.all([
                fetchWithAuth('/stats'),
                fetchWithAuth('/stats/weekly-performance'),
                fetchWithAuth('/stats/vehicle-status'),
                fetchWithAuth('/stats/revenue-by-line'),
                fetchWithAuth('/stats/maintenance-alerts'),
            ]);

            if (sRes.ok) setStats(await sRes.json());
            if (wRes.ok) setWeeklyData(await wRes.json());
            if (vRes.ok) setVehicleStatus(await vRes.json());
            if (rRes.ok) setRevenueByLine(await rRes.json());
            if (mRes.ok) setMaintenanceAlerts(await mRes.json());
        } catch (err) {
            console.error("Dashboard load failed", err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} padding="md">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                            <Skeleton height="12px" width="60%" style={{ marginBottom: '8px' }} />
                            <Skeleton height="24px" width="40%" />
                        </div>
                        <Skeleton variant="circle" height="40px" width="40px" />
                    </div>
                </Card>
            ))}
        </div>
    );

    const lineData = {
        labels: weeklyData.map((d: any) => d.jour_nom),
        datasets: [
            {
                label: 'Trajets',
                data: weeklyData.map((d: any) => d.nb_trajets),
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#2563eb',
                pointRadius: 4,
            }
        ]
    };

    const statusColors: Record<string, string> = {
        actif: '#10b981', maintenance: '#f59e0b', hors_service: '#ef4444'
    };
    
    const doughnutData = {
        labels: vehicleStatus.map((v: any) => v.statut),
        datasets: [{
            data: vehicleStatus.map((v: any) => v.nb),
            backgroundColor: vehicleStatus.map((v: any) => statusColors[v.statut] || '#64748b'),
            borderWidth: 0,
        }]
    };

    const barData = {
        labels: revenueByLine.map((r: any) => r.ligne),
        datasets: [{
            label: 'Recettes (FCFA)',
            data: revenueByLine.map((r: any) => r.recette_totale),
            backgroundColor: 'rgba(37, 99, 235, 0.8)',
            borderRadius: 6,
            borderSkipped: false,
        }]
    };

    const chartOptions = {
        maintainAspectRatio: false,
        plugins: { 
            legend: { 
                display: false 
            },
            tooltip: {
                backgroundColor: '#0f172a',
                padding: 12,
                titleFont: { size: 14, weight: 700 },
                bodyFont: { size: 13 },
                cornerRadius: 8,
                displayColors: false
            }
        },
        scales: { 
            y: { 
                beginAtZero: true, 
                grid: { color: 'rgba(226, 232, 240, 0.5)' },
                border: { display: false },
                ticks: { font: { size: 11 } }
            },
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: { font: { size: 11 } }
            }
        }
    };

    const urgentAlerts = maintenanceAlerts.filter((a: any) => a.jours_restants <= 3);

    return (
        <div className="animate-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* ALERT BOX */}
            {urgentAlerts.length > 0 && (
                <div className="card" style={{ 
                    background: 'var(--danger-50)', 
                    borderColor: 'rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 20px'
                }}>
                    <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '10px', 
                        background: 'var(--danger)', 
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                    }}>
                        <AlertTriangle size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, color: 'var(--danger-700)', fontSize: '14px' }}>
                            {urgentAlerts.length} Attention : {urgentAlerts.length} maintenance(s) critique(s)
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--danger-600)' }}>
                            Les véhicules {urgentAlerts.map(a => a.vehicule).slice(0, 3).join(', ')} nécessitent une intervention immédiate.
                        </p>
                    </div>
                    <Button variant="danger" size="sm" onClick={() => setActivePage('maintenance')}>
                        Gérer <ChevronRight size={14} />
                    </Button>
                </div>
            )}

            {/* KPI GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '20px' }}>
                <KPICard
                    title="Véhicules Actifs"
                    value={stats?.vehicules_actifs ?? 0}
                    total={(stats?.vehicules_actifs ?? 0) + (vehicleStatus.reduce((s: number, v: any) => v.statut !== 'actif' ? s + v.nb : s, 0))}
                    icon={<Bus size={22} />}
                    color="var(--primary)"
                    sparkData={[12, 14, 13, 15, 12, 16, 14]}
                    onClick={() => setActivePage('vehicules')}
                />
                <KPICard
                    title="Chauffeurs Libres"
                    value={stats?.chauffeurs_disponibles ?? 0}
                    total={15}
                    icon={<Users size={22} />}
                    color="var(--success)"
                    sparkData={[8, 10, 9, 11, 7, 10, 12]}
                    onClick={() => setActivePage('chauffeurs')}
                />
                <KPICard
                    title="Recette Journalière"
                    value={`${((stats?.recette_jour ?? 0) / 1000).toFixed(0)}k`}
                    subtitle="FCFA"
                    icon={<Coins size={22} />}
                    color="var(--purple)"
                    sparkData={[45, 52, 48, 61, 55, 68, 72]}
                    onClick={() => setActivePage('trips')}
                />
                <KPICard
                    title="Incidents Ouverts"
                    value={stats?.incidents_ouverts ?? 0}
                    subtitle={`dont ${stats?.incidents_graves ?? 0} critiques`}
                    icon={<AlertTriangle size={22} />}
                    color="var(--danger)"
                    sparkData={[2, 4, 1, 3, 5, 2, 4]}
                    onClick={() => setActivePage('incidents')}
                />
            </div>

            {/* MAIN CHARTS SECTION */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                
                {/* PERFORMANCE LINE CHART */}
                <Card 
                    title="Activité de la Flotte" 
                    subtitle="Évolution du volume de trajets hebdomadaires"
                    extra={<Badge variant="primary">Temps Réel</Badge>}
                >
                    <div style={{ height: '300px', marginTop: '12px' }}>
                        {chartsReady && weeklyData.length > 0 ? (
                            <Line data={lineData} options={chartOptions} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                                <Map size={48} style={{ opacity: 0.1, marginBottom: '12px' }} />
                                <p>Collecte des données en cours...</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* STATUS DOUGHNUT */}
                <Card title="État Opérationnel" subtitle="Répartition globale du parc">
                    <div style={{ height: '200px', margin: '20px 0', display: 'flex', justifyContent: 'center' }}>
                        {chartsReady && vehicleStatus.length > 0 && (
                            <Doughnut data={doughnutData} options={{ 
                                maintainAspectRatio: false, 
                                cutout: '75%',
                                plugins: { legend: { display: false } }
                            }} />
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {vehicleStatus.map((v: any) => (
                            <div key={v.statut} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[v.statut] || '#64748b' }}></div>
                                    <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{v.statut}</span>
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 800 }}>{v.nb}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* REVENUE BY LINE SECTION */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
                
                {/* BAR CHART */}
                <Card title="Recettes par Ligne">
                    <div style={{ height: '280px', marginTop: '12px' }}>
                        {chartsReady && (
                            <Bar data={barData} options={chartOptions} />
                        )}
                    </div>
                </Card>

                {/* TOP ROUTES PROGRESS */}
                <Card title="Top Performances" subtitle="Lignes les plus rentables">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                        {revenueByLine.slice(0, 5).map((r: any, i: number) => (
                            <div key={r.ligne}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700 }}>
                                        {r.ligne} <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '12px', marginLeft: '4px' }}>{r.nom.split('-')[1]?.trim() || r.nom}</span>
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)' }}>
                                        {(r.recette_totale / 1000).toFixed(0)}k FCFA
                                    </span>
                                </div>
                                <div style={{ height: '6px', width: '100%', background: 'var(--bg-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        height: '100%', 
                                        width: `${(r.recette_totale / (revenueByLine[0]?.recette_totale || 1)) * 100}%`,
                                        background: i === 0 ? 'var(--gradient-primary)' : i === 1 ? 'var(--success)' : 'var(--primary-400)',
                                        borderRadius: '10px'
                                    }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" fullWidth style={{ marginTop: '20px' }} onClick={() => setActivePage('lines')}>
                        Voir toutes les routes
                    </Button>
                </Card>
            </div>
        </div>
    );
}

function KPICard({ title, value, subtitle, total, icon, color, sparkData, onClick }: any) {
    return (
        <Card 
            interactive={!!onClick} 
            onClick={onClick} 
            padding="none"
            style={{ overflow: 'hidden', border: '1px solid var(--border)' }}
        >
            <div style={{ padding: '20px 20px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '12px', 
                        background: `${color}15`, 
                        color: color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 4px 12px ${color}10`
                    }}>
                        {icon}
                    </div>
                </div>
                
                <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {title}
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
                        {value}
                    </span>
                    {total && (
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>
                            / {total}
                        </span>
                    )}
                    {subtitle && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: '4px' }}>
                            {subtitle}
                        </span>
                    )}
                </div>
            </div>
            
            {/* SPARKLINE AT BOTTOM */}
            <div style={{ height: '40px', width: '100%', marginTop: '10px' }}>
                <Sparkline data={sparkData} color={color} />
            </div>
        </Card>
    );
}
