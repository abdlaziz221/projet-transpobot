/* eslint-disable */
'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
    Bus, Users, Navigation, TrendingUp, Coins, Wrench,
    ArrowUpRight, ArrowDownRight, Loader2, AlertTriangle
} from 'lucide-react';
import { fetchWithAuth } from '../lib/api';

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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: 'var(--text-muted)' }}>
            <Loader2 className="animate-spin" size={40} style={{ color: 'var(--primary)' }} />
            <p style={{ marginTop: '16px', fontWeight: 500 }}>Chargement de vos indicateurs...</p>
        </div>
    );

    // Calcul des tendances à partir des données hebdomadaires
    const lastWeekRevenue = weeklyData.slice(-7).reduce((s: number, d: any) => s + d.recette_totale, 0);
    const prevWeekRevenue = lastWeekRevenue * 0.9; // Simulation comparaison
    const revenueTrend = prevWeekRevenue > 0 ? ((lastWeekRevenue - prevWeekRevenue) / prevWeekRevenue * 100).toFixed(1) : '0';

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
            },
            {
                label: 'Recettes (×10k FCFA)',
                data: weeklyData.map((d: any) => (d.recette_totale / 10000).toFixed(1)),
                borderColor: '#10b981',
                backgroundColor: 'transparent',
                borderDash: [5, 5],
                tension: 0.4,
                pointBackgroundColor: '#10b981',
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
        plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } } }
    };

    const urgentAlerts = maintenanceAlerts.filter((a: any) => a.jours_restants <= 3);

    return (
        <div className="animate-up">
            {/* Alertes Critiques */}
            {urgentAlerts.length > 0 && (
                <div className="alert alert-danger" style={{ marginBottom: '24px' }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                    <span>
                        <strong>{urgentAlerts.length} maintenance(s) urgente(s)</strong> dans les 3 prochains jours :&nbsp;
                        {urgentAlerts.map((a: any) => a.vehicule).join(', ')}
                    </span>
                </div>
            )}

            {/* KPI TOP ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                <KPICard
                    title="Véhicules Actifs"
                    value={stats?.vehicules_actifs ?? 0}
                    total={`/ ${(stats?.vehicules_actifs ?? 0) + (vehicleStatus.reduce((s: number, v: any) => v.statut !== 'actif' ? s + v.nb : s, 0))}`}
                    icon={<Bus size={22} />}
                    color="#2563eb"
                    trend={`+${Math.round((stats?.vehicules_actifs / 12) * 100)}%`}
                    positive
                    onClick={() => setActivePage('vehicules')}
                />
                <KPICard
                    title="Chauffeurs Libres"
                    value={stats?.chauffeurs_disponibles ?? 0}
                    total="/ 15"
                    icon={<Users size={22} />}
                    color="#10b981"
                    trend={`${stats?.chauffeurs_disponibles ?? 0}/15 dispo`}
                    positive
                    onClick={() => setActivePage('chauffeurs')}
                />
                <KPICard
                    title="Trajets Aujourd'hui"
                    value={stats?.trajets_aujourd_hui ?? 0}
                    icon={<Navigation size={22} />}
                    color="#0ea5e9"
                    trend={`${stats?.on_time_rate ?? 0}% ponctualité`}
                    positive={(stats?.on_time_rate ?? 0) > 90}
                    onClick={() => setActivePage('trips')}
                />
                <KPICard
                    title="Recette du Jour"
                    value={`${((stats?.recette_jour ?? 0) / 1000).toFixed(0)}k`}
                    subtitle="FCFA"
                    icon={<Coins size={22} />}
                    color="#7c3aed"
                    trend={`${((stats?.recette_semaine ?? 0) / 1000).toFixed(0)}k / semaine`}
                    positive
                    onClick={() => setActivePage('trips')}
                />
                <KPICard
                    title="Incidents Ouverts"
                    value={stats?.incidents_ouverts ?? 0}
                    subtitle={`dont ${stats?.incidents_graves ?? 0} critiques`}
                    icon={<AlertTriangle size={22} />}
                    color="#ef4444"
                    trend={stats?.incidents_graves > 0 ? `${stats?.incidents_graves} critiques` : 'Aucun critique'}
                    positive={(stats?.incidents_graves ?? 1) === 0}
                    onClick={() => setActivePage('incidents')}
                />
                <KPICard
                    title="Maintenance"
                    value={stats?.maintenances_en_attente ?? 0}
                    subtitle="en attente"
                    icon={<Wrench size={22} />}
                    color="#f59e0b"
                    trend={`${urgentAlerts.length} urgentes`}
                    positive={urgentAlerts.length === 0}
                    onClick={() => setActivePage('maintenance')}
                />
            </div>

            {/* CHARTS ROW 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div className="card">
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Performance de la Flotte</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Activité des 7 derniers jours</p>
                    </div>
                    <div style={{ height: '280px' }}>
                        {chartsReady && weeklyData.length > 0 && <Line data={lineData} options={chartOptions} />}
                        {weeklyData.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '80px' }}>Aucune donnée cette semaine</p>}
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px' }}>État du Parc</h3>
                    <div style={{ height: '180px', display: 'flex', justifyContent: 'center' }}>
                        {chartsReady && vehicleStatus.length > 0 && (
                            <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } }, cutout: '70%' }} />
                        )}
                    </div>
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                        {vehicleStatus.map((v: any) => (
                            <div key={v.statut} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: '13px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[v.statut] || '#64748b', display: 'inline-block' }}></span>
                                    {v.statut}
                                </span>
                                <strong>{v.nb}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CHARTS ROW 2 */}
            {revenueByLine.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                    <div className="card">
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Recettes par Ligne</h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>30 derniers jours</p>
                        </div>
                        <div style={{ height: '260px' }}>
                            {chartsReady && (
                                <Bar data={barData} options={{ ...chartOptions, plugins: { legend: { display: false } } }} />
                            )}
                        </div>
                    </div>

                    <div className="card">
                        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Top Lignes</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {revenueByLine.slice(0, 5).map((r: any, i: number) => (
                                <div key={r.ligne}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                                        <span style={{ fontWeight: 600 }}>{r.ligne} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{r.nom.split('-')[1]?.trim()}</span></span>
                                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{(r.recette_totale / 1000).toFixed(0)}k</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-bar-fill"
                                            style={{
                                                width: `${(r.recette_totale / revenueByLine[0].recette_totale) * 100}%`,
                                                background: i === 0 ? 'var(--primary)' : i === 1 ? 'var(--info)' : 'var(--success)'
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function KPICard({ title, value, subtitle, total, icon, color, trend, positive, onClick }: any) {
    return (
        <div className="card" onClick={onClick} style={{ padding: '20px', cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 500 }}>{title}</p>
                    <p style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', lineHeight: 1 }}>
                        {value}
                        {total && <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '4px' }}>{total}</span>}
                        {subtitle && <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '6px' }}>{subtitle}</span>}
                    </p>
                </div>
                <div style={{
                    width: '44px', height: '44px', borderRadius: '10px',
                    background: `${color}15`, color: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {icon}
                </div>
            </div>
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <span style={{ color: positive ? 'var(--success)' : 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                    {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                </span>
                <span style={{ color: '#94a3b8' }}>{trend}</span>
            </div>
        </div>
    );
}
