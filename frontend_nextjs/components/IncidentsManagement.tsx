/* eslint-disable */
'use client';
import React, { useEffect, useState } from 'react';
import {
    AlertTriangle, ShieldAlert, CheckCircle2, Clock,
    Plus, Check, Filter, Trash2
} from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import Modal from './Modal';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false });

ChartJS.register(ArcElement, Tooltip, Legend);

export default function IncidentsManagement({ search, setSearch }: any) {
    const [incidents, setIncidents] = useState<any[]>([]);
    const [ranking, setRanking] = useState<any[]>([]);
    const [incidentsByType, setIncidentsByType] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [severityFilter, setSeverityFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [trajets, setTrajets] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        trajet_id: 1,
        type: 'Accident',
        description: '',
        gravite: 'moyen',
        resolu: false,
        date_incident: new Date().toISOString()
    });

    useEffect(() => { loadData(); }, [severityFilter]);

    useEffect(() => {
        // Charger les trajets récents pour le select
        fetchWithAuth('/trajets_custom?limit=20&page=1').then(async res => {
            if (res.ok) {
                const data = await res.json();
                const list = data.data || [];
                setTrajets(list);
                if (list.length > 0) setFormData(prev => ({ ...prev, trajet_id: list[0].id }));
            }
        });
    }, []);

    async function loadData() {
        try {
            const [iRes, rRes, sRes, tRes] = await Promise.all([
                fetchWithAuth(`/incidents_custom${severityFilter !== 'All' ? `?gravite=${severityFilter}` : ''}`),
                fetchWithAuth('/stats/incidents-ranking'),
                fetchWithAuth('/stats'),
                fetchWithAuth('/stats/incidents-by-type'),
            ]);

            if (iRes.ok) {
                const d = await iRes.json();
                setIncidents(d.data || []);
            }
            if (rRes.ok) setRanking(await rRes.json());
            if (sRes.ok) setStats(await sRes.json());
            if (tRes.ok) setIncidentsByType(await tRes.json());
            setLoading(false);
        } catch (err) {
            console.error("Incidents load failed", err);
            setLoading(false);
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetchWithAuth('/incidents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, date_incident: new Date().toISOString() })
        });
        if (res.ok) {
            toast.success('Incident signalé !');
            setIsModalOpen(false);
            setFormData({ trajet_id: 1, type: 'Accident', description: '', gravite: 'moyen', resolu: false, date_incident: new Date().toISOString() });
            loadData();
        } else toast.error("Erreur lors du signalement.");
    }

    async function resolveIncident(id: number) {
        const res = await fetchWithAuth(`/incidents_custom/${id}/resolve`, { method: 'PATCH' });
        if (res.ok) {
            toast.success('Incident résolu !');
            loadData();
        } else toast.error('Erreur lors de la résolution.');
    }

    async function handleDelete(id: number) {
        if (!confirm("Supprimer ce rapport d'incident ?")) return;
        const res = await fetchWithAuth(`/incidents/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success("Incident supprimé.");
            loadData();
        } else toast.error("Erreur lors de la suppression.");
    }

    const typeColors: Record<string, string> = {
        Accident: '#ef4444', Panne: '#f59e0b', Retard: '#0ea5e9', Comportement: '#7c3aed'
    };

    const doughnutData = {
        labels: incidentsByType.map((t: any) => t.type),
        datasets: [{
            data: incidentsByType.map((t: any) => t.nb),
            backgroundColor: incidentsByType.map((t: any) => typeColors[t.type] || '#64748b'),
            borderWidth: 0,
        }]
    };

    return (
        <div className="animate-up">
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Statistiques & Rapports
                </h2>
                <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} /> Signaler un incident
                </button>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <IncKPI label="Total Incidents" value={incidents.length} icon={<AlertTriangle />} color="#64748b" />
                <IncKPI label="Critiques (non résolus)" value={stats?.incidents_graves || 0} icon={<ShieldAlert />} color="var(--danger)" />
                <IncKPI label="À traiter" value={stats?.incidents_ouverts || 0} icon={<Clock />} color="var(--warning)" />
                <IncKPI label="Résolus" value={incidents.filter(i => i.resolu).length} icon={<CheckCircle2 />} color="var(--success)" />
            </div>

            <div className="split-view">
                {/* TABLE INCIDENTS */}
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Historique des Signalements</h3>
                        <select
                            value={severityFilter}
                            onChange={e => setSeverityFilter(e.target.value)}
                            style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
                        >
                            <option value="All">Toutes gravités</option>
                            <option value="grave">Critique</option>
                            <option value="moyen">Moyen</option>
                            <option value="faible">Mineur</option>
                        </select>
                    </div>
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Type / Description</th>
                                    <th>Chauffeur</th>
                                    <th>Gravité</th>
                                    <th>Date</th>
                                    <th>Statut</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></td></tr>
                                ) : incidents.length === 0 ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Aucun incident trouvé.</td></tr>
                                ) : (
                                    incidents
                                        .filter(i => 
                                        i.type.toLowerCase().includes(search.toLowerCase()) || 
                                        i.description.toLowerCase().includes(search.toLowerCase()) ||
                                        i.chauffeur.toLowerCase().includes(search.toLowerCase())
                                    )
                                    .map(i => (
                                    <tr key={i.id}>
                                        <td>
                                            <p style={{ fontWeight: 600, fontSize: '13px' }}>{i.type}</p>
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.description}</p>
                                            <p style={{ fontSize: '11px', color: 'var(--info)' }}>{i.ligne}</p>
                                        </td>
                                        <td style={{ fontSize: '13px' }}>{i.chauffeur}</td>
                                        <td>
                                            <span className={`badge badge-${i.gravite === 'grave' ? 'danger' : i.gravite === 'moyen' ? 'warning' : 'gray'}`}>
                                                {i.gravite}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            {i.date_incident ? new Date(i.date_incident).toLocaleDateString('fr-FR') : '—'}
                                        </td>
                                        <td>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                                {i.resolu ? <CheckCircle2 size={14} color="var(--success)" /> : <Clock size={14} color="var(--warning)" />}
                                                {i.resolu ? 'Résolu' : 'Ouvert'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {!i.resolu && (
                                                    <button className="icon-btn" onClick={() => resolveIncident(i.id)} title="Marquer résolu">
                                                        <Check size={15} />
                                                    </button>
                                                )}
                                                <button className="icon-btn" onClick={() => handleDelete(i.id)} title="Supprimer" style={{ color: 'var(--danger)' }}>
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Chauffeurs à Risque */}
                    <div className="card">
                        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Chauffeurs à Risque</h3>
                        {ranking.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--success)', fontSize: '13px', padding: '20px' }}>✓ Aucun incident signalé ce mois</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {ranking.map((r: any) => (
                                    <div key={r.id}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                            <span style={{ fontWeight: 600 }}>{r.chauffeur}</span>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                {r.graves > 0 && <span className="badge badge-danger" style={{ fontSize: '10px' }}>{r.graves} crit.</span>}
                                                <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{r.total} total</span>
                                            </div>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-bar-fill" style={{ width: `${(r.total / (ranking[0]?.total || 1)) * 100}%`, background: r.graves > 0 ? 'var(--danger)' : 'var(--warning)' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Répartition par type */}
                    {incidentsByType.length > 0 && (
                        <div className="card">
                            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Répartition par Type</h3>
                            <div style={{ height: '180px', display: 'flex', justifyContent: 'center' }}>
                                <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } }, cutout: '65%' }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL SIGNALEMENT */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Signaler un Incident">
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Trajet concerné *</label>
                        <select value={formData.trajet_id} onChange={e => setFormData({ ...formData, trajet_id: +e.target.value })}>
                            {trajets.map((t: any) => (
                                <option key={t.id} value={t.id}>#{t.id} — {t.ligne_code} {t.origine}→{t.destination} ({t.chauffeur})</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Type d'incident *</label>
                            <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                <option value="Accident">Accident</option>
                                <option value="Panne">Panne Technique</option>
                                <option value="Retard">Retard Majeur</option>
                                <option value="Comportement">Comportement Chauffeur</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Gravité *</label>
                            <select value={formData.gravite} onChange={e => setFormData({ ...formData, gravite: e.target.value })}>
                                <option value="faible">Faible / Mineur</option>
                                <option value="moyen">Moyen</option>
                                <option value="grave">Critique / Grave</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Description détaillée *</label>
                        <textarea rows={4} required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Que s'est-il passé ?" />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Annuler</button>
                        <button type="submit" className="btn-primary">Envoyer le rapport</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function IncKPI({ label, value, icon, color }: any) {
    return (
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {React.cloneElement(icon, { size: 20 })}
            </div>
            <div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>{label}</p>
                <p style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.2 }}>{value}</p>
            </div>
        </div>
    );
}
