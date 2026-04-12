/* eslint-disable */
'use client';
import React, { useEffect, useState } from 'react';
import { Navigation, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Filter, Plus, FileSpreadsheet } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { exportToExcel } from '../lib/excelUtils';
import Modal from './Modal';

const STATUT_COLORS: Record<string, string> = {
    termine: 'success', en_cours: 'info', planifie: 'gray', annule: 'danger'
};

export default function TripsTracking({ search, setSearch }: any) {
    const [trips, setTrips] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [filterStatut, setFilterStatut] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [lines, setLines] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        ligne_id: 0,
        chauffeur_id: 0,
        vehicule_id: 0,
        date_heure_depart: new Date().toISOString().slice(0, 16),
        statut: 'planifie',
        nb_passagers: 0,
        recette: 0
    });
    const LIMIT = 15;

    useEffect(() => { loadData(); }, [page, filterStatut]);

    async function loadData() {
        setLoading(true);
        try {
            const statutParam = filterStatut !== 'all' ? `&statut=${filterStatut}` : '';
            const [tRes, sRes] = await Promise.all([
                fetchWithAuth(`/trajets_custom?page=${page}&limit=${LIMIT}${statutParam}`),
                fetchWithAuth('/stats/trips-summary'),
            ]);

            if (tRes.ok) {
                const data = await tRes.json();
                setTrips(data.data || []);
                setTotal(data.total || 0);
                setPages(data.pages || 1);
            }
            if (sRes.ok) setSummary(await sRes.json());
        } catch (err) {
            console.error("Trips load failed", err);
        } finally {
            setLoading(false);
        }
    }

    async function loadOptions() {
        const [lRes, dRes, vRes] = await Promise.all([
            fetchWithAuth('/lignes'),
            fetchWithAuth('/chauffeurs?disponibilite=true'),
            fetchWithAuth('/vehicules?statut=actif')
        ]);
        if (lRes.ok) setLines(await lRes.json());
        if (dRes.ok) setDrivers(await dRes.json());
        if (vRes.ok) setVehicles(await vRes.json());
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (formData.ligne_id === 0 || formData.chauffeur_id === 0 || formData.vehicule_id === 0) {
            alert("Veuillez remplir tous les champs");
            return;
        }
        const res = await fetchWithAuth('/trajets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (res.ok) {
            setIsModalOpen(false);
            loadData();
        } else {
            alert("Erreur lors de l'ajout");
        }
    }

    function openAdd() {
        loadOptions();
        setIsModalOpen(true);
    }

    function formatDate(iso: string) {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }

    function formatTime(iso: string) {
        if (!iso) return '';
        return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <div className="animate-up">
            {/* KPI ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <TripKPI label="Total Trajets" value={summary?.total || 0} icon={<Navigation />} color="#2563eb" />
                <TripKPI label="En cours" value={summary?.en_cours || 0} icon={<Clock />} color="#0ea5e9" />
                <TripKPI label="Terminés" value={summary?.termine || 0} icon={<CheckCircle />} color="#10b981" />
                <TripKPI label="Annulés" value={summary?.annule || 0} icon={<XCircle />} color="#ef4444" />
            </div>

            {/* TABLE */}
            <div className="card" style={{ padding: 0 }}>
                {/* Toolbar */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700 }}>
                        Activité Récente <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)' }}>({total} trajets)</span>
                    </h3>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <select value={filterStatut} onChange={e => { setFilterStatut(e.target.value); setPage(1); }} style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}>
                            <option value="all">Tous statuts</option>
                            <option value="termine">Terminés</option>
                            <option value="en_cours">En cours</option>
                            <option value="planifie">Planifiés</option>
                            <option value="annule">Annulés</option>
                        </select>
                        <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => exportToExcel(trips, 'Historique_Trajets_TranspoBot')}>
                            <FileSpreadsheet size={14} /> Excel
                        </button>
                        <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={openAdd}>
                            <Plus size={14} /> Nouveau
                        </button>
                    </div>
                </div>

                <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Date & Heure</th>
                                <th>Itinéraire</th>
                                <th>Chauffeur</th>
                                <th>Véhicule</th>
                                <th>Passagers</th>
                                <th>Recette</th>
                                <th>Statut</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></td></tr>
                            ) : trips.length === 0 ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Aucun trajet trouvé.</td></tr>
                            ) : trips
                                .filter(t => 
                                    t.chauffeur.toLowerCase().includes(search.toLowerCase()) || 
                                    t.ligne_code.toLowerCase().includes(search.toLowerCase())
                                )
                                .map(t => (
                                <tr key={`trip-${t.id}`}>
                                    <td style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '12px' }}>
                                        #{String(t.id).padStart(4, '0')}
                                    </td>
                                    <td>
                                        <p style={{ fontSize: '13px', fontWeight: 600 }}>{formatDate(t.date_heure_depart)}</p>
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatTime(t.date_heure_depart)}</p>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '13px' }}>
                                            <span className="badge badge-info" style={{ fontSize: '10px', marginBottom: '4px' }}>{t.ligne_code}</span>
                                            <p style={{ fontWeight: 600 }}>{t.origine}</p>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>→ {t.destination}</p>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '13px' }}>{t.chauffeur}</td>
                                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        <span className="badge badge-gray" style={{ fontSize: '11px' }}>{t.vehicule}</span>
                                    </td>
                                    <td style={{ fontSize: '13px', fontWeight: 600 }}>
                                        {t.nb_passagers > 0 ? t.nb_passagers : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                    </td>
                                    <td style={{ fontSize: '13px', fontWeight: 600, color: t.recette > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                                        {t.recette > 0 ? `${(t.recette / 1000).toFixed(0)}k` : '—'}
                                    </td>
                                    <td>
                                        <span className={`badge badge-${STATUT_COLORS[t.statut] || 'gray'}`}>
                                            {t.statut}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pages > 1 && (
                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <span>Page {page} / {pages} — {total} résultats</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="icon-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                <ChevronLeft size={16} />
                            </button>
                            <button className="icon-btn" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Programmer un Trajet">
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Ligne *</label>
                        <select value={formData.ligne_id} onChange={e => setFormData({ ...formData, ligne_id: +e.target.value })}>
                            <option value={0}>Sélectionner une ligne</option>
                            {lines.map((l: any) => (
                                <option key={l.id} value={l.id}>{l.code} - {l.origine} → {l.destination}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Chauffeur *</label>
                            <select value={formData.chauffeur_id} onChange={e => setFormData({ ...formData, chauffeur_id: +e.target.value })}>
                                <option value={0}>Choisir Chauffeur</option>
                                {drivers.map((d: any) => (
                                    <option key={d.id} value={d.id}>{d.prenom} {d.nom}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Véhicule *</label>
                            <select value={formData.vehicule_id} onChange={e => setFormData({ ...formData, vehicule_id: +e.target.value })}>
                                <option value={0}>Choisir Véhicule</option>
                                {vehicles.map((v: any) => (
                                    <option key={v.id} value={v.id}>{v.immatriculation}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Départ Prévu *</label>
                        <input type="datetime-local" required value={formData.date_heure_depart} onChange={e => setFormData({ ...formData, date_heure_depart: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Annuler</button>
                        <button type="submit" className="btn-primary">Programmer</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function TripKPI({ label, value, icon, color }: any) {
    return (
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {React.cloneElement(icon, { size: 20 })}
            </div>
            <div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</p>
                <p style={{ fontSize: '20px', fontWeight: 800 }}>{value}</p>
            </div>
        </div>
    );
}
