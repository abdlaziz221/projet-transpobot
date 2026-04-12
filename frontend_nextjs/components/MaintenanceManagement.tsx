/* eslint-disable */
'use client';
import React, { useEffect, useState } from 'react';
import { Wrench, AlertTriangle, CheckCircle, Clock, Plus, Check, Calendar, Trash2 } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import Modal from './Modal';
import toast from 'react-hot-toast';

export default function MaintenanceManagement({ search, setSearch }: any) {
    const [maintenances, setMaintenances] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filterEffectuee, setFilterEffectuee] = useState<string>('all');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [vehicles, setVehicles] = useState<any[]>([]);

    const [addForm, setAddForm] = useState({
        vehicule_id: 1,
        type: 'Vidange',
        description: '',
        date_prevue: new Date().toISOString().split('T')[0],
        cout: 0,
        effectuee: false,
    });

    useEffect(() => {
        loadAll();
        fetchWithAuth('/vehicules_custom').then(async r => {
            if (r.ok) {
                const data = await r.json();
                setVehicles(data);
                if (data.length > 0) setAddForm(prev => ({ ...prev, vehicule_id: data[0].id }));
            }
        });
    }, [filterEffectuee]);

    async function loadAll() {
        setLoading(true);
        try {
            const effectParam = filterEffectuee !== 'all' ? `?effectuee=${filterEffectuee === 'oui'}` : '';
            const [mRes, sRes] = await Promise.all([
                fetchWithAuth(`/maintenance_custom${effectParam}`),
                fetchWithAuth('/stats'),
            ]);
            if (mRes.ok) setMaintenances(await mRes.json());
            if (sRes.ok) setStats(await sRes.json());
        } catch (err) {
            console.error('Maintenance load failed', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetchWithAuth('/maintenance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...addForm, date_realisee: null })
        });
        if (res.ok) {
            toast.success('Maintenance planifiée !');
            setIsAddOpen(false);
            setAddForm({ vehicule_id: 1, type: 'Vidange', description: '', date_prevue: new Date().toISOString().split('T')[0], cout: 0, effectuee: false });
            loadAll();
        } else toast.error("Erreur lors de la planification.");
    }

    async function markComplete(id: number, vehicule: string) {
        if (!confirm(`Marquer la maintenance de ${vehicule} comme effectuée aujourd'hui ?`)) return;
        const res = await fetchWithAuth(`/maintenance_custom/${id}/complete`, { method: 'PATCH' });
        if (res.ok) {
            toast.success('Maintenance marquée effectuée !');
            loadAll();
        } else toast.error('Erreur.');
    }

    async function handleDelete(id: number) {
        if (!confirm("Supprimer cette planification de maintenance ?")) return;
        const res = await fetchWithAuth(`/maintenance/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success("Maintenance supprimée.");
            loadAll();
        } else toast.error("Erreur lors de la suppression.");
    }

    const alerts = stats?.maintenances_en_attente || 0;
    const enRetard = maintenances.filter(m => m.en_retard).length;
    const effectueeCount = maintenances.filter(m => m.effectuee).length;
    const coutTotal = maintenances.filter(m => m.effectuee).reduce((s, m) => s + m.cout, 0);

    return (
        <div className="animate-up">
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
                <div />
                <button className="btn-primary" onClick={() => setIsAddOpen(true)}>
                    <Plus size={18} /> Planifier une Maintenance
                </button>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <MaintKPI label="En Attente" value={alerts} icon={<Clock />} color="var(--warning)" />
                <MaintKPI label="En Retard" value={enRetard} icon={<AlertTriangle />} color="var(--danger)" />
                <MaintKPI label="Effectuées" value={effectueeCount} icon={<CheckCircle />} color="var(--success)" />
                <MaintKPI label={`Coût Total (FCFA)`} value={`${(coutTotal / 1000).toFixed(0)}k`} icon={<Wrench />} color="var(--primary)" />
            </div>

            {/* ALERTES */}
            {enRetard > 0 && (
                <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                    <span><strong>{enRetard} maintenance(s) en retard</strong> — intervention urgente requise.</span>
                </div>
            )}

            {/* TABLE */}
            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Planning des Maintenances</h3>
                    <select value={filterEffectuee} onChange={e => setFilterEffectuee(e.target.value)} style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}>
                        <option value="all">Toutes</option>
                        <option value="non">En attente</option>
                        <option value="oui">Effectuées</option>
                    </select>
                </div>
                <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Véhicule</th>
                                <th>Type</th>
                                <th>Description</th>
                                <th>Date Prévue</th>
                                <th>Date Réalisée</th>
                                <th>Coût (FCFA)</th>
                                <th>Statut</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></td></tr>
                            ) : maintenances.length === 0 ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Aucune maintenance.</td></tr>
                            ) : maintenances
                                .filter(m => 
                                    m.vehicule.toLowerCase().includes(search.toLowerCase()) || 
                                    m.type.toLowerCase().includes(search.toLowerCase()) ||
                                    m.description.toLowerCase().includes(search.toLowerCase())
                                )
                                .map(m => (
                                <tr key={m.id}>
                                    <td>
                                        <p style={{ fontWeight: 700, fontSize: '13px' }}>{m.vehicule}</p>
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{m.type_vehicule}</p>
                                    </td>
                                    <td>
                                        <span className="badge badge-purple" style={{ fontSize: '11px' }}>{m.type}</span>
                                    </td>
                                    <td style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '200px' }}>
                                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.description}</span>
                                    </td>
                                    <td style={{ fontSize: '13px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: m.en_retard ? 'var(--danger)' : 'inherit' }}>
                                            <Calendar size={13} />
                                            {m.date_prevue ? new Date(m.date_prevue).toLocaleDateString('fr-FR') : '—'}
                                            {m.jours_restants !== null && !m.effectuee && (
                                                <span style={{ fontSize: '10px', color: m.en_retard ? 'var(--danger)' : m.jours_restants <= 7 ? 'var(--warning)' : 'var(--text-muted)' }}>
                                                    ({m.en_retard ? `${Math.abs(m.jours_restants)}j retard` : `${m.jours_restants}j`})
                                                </span>
                                            )}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                        {m.date_realisee ? new Date(m.date_realisee).toLocaleDateString('fr-FR') : '—'}
                                    </td>
                                    <td style={{ fontSize: '13px', fontWeight: 600 }}>
                                        {(m.cout / 1000).toFixed(0)}k
                                    </td>
                                    <td>
                                        <span className={`badge badge-${m.effectuee ? 'success' : m.en_retard ? 'danger' : 'warning'}`}>
                                            {m.effectuee ? 'Effectuée' : m.en_retard ? 'En retard' : 'Planifiée'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {!m.effectuee && (
                                                <button className="icon-btn" title="Marquer effectuée" onClick={() => markComplete(m.id, m.vehicule)}>
                                                    <Check size={15} />
                                                </button>
                                            )}
                                            <button className="icon-btn" title="Supprimer" onClick={() => handleDelete(m.id)} style={{ color: 'var(--danger)' }}>
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL PLANIFIER */}
            <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Planifier une Maintenance">
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Véhicule *</label>
                        <select value={addForm.vehicule_id} onChange={e => setAddForm({ ...addForm, vehicule_id: +e.target.value })}>
                            {vehicles.map((v: any) => (
                                <option key={v.id} value={v.id}>{v.immatriculation} ({v.type})</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Type *</label>
                            <select value={addForm.type} onChange={e => setAddForm({ ...addForm, type: e.target.value })}>
                                <option value="Vidange">Vidange</option>
                                <option value="Révision">Révision</option>
                                <option value="Pneumatiques">Pneumatiques</option>
                                <option value="Carrosserie">Carrosserie</option>
                                <option value="Freins">Freins</option>
                                <option value="Autre">Autre</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Date Prévue *</label>
                            <input type="date" required value={addForm.date_prevue} onChange={e => setAddForm({ ...addForm, date_prevue: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Description *</label>
                        <textarea rows={3} required value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })} placeholder="Décrivez les travaux à effectuer..." />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Coût estimé (FCFA)</label>
                        <input type="number" value={addForm.cout} onChange={e => setAddForm({ ...addForm, cout: +e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary" onClick={() => setIsAddOpen(false)}>Annuler</button>
                        <button type="submit" className="btn-primary">Planifier</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function MaintKPI({ label, value, icon, color }: any) {
    return (
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {React.cloneElement(icon, { size: 20 })}
            </div>
            <div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>{label}</p>
                <p style={{ fontSize: '20px', fontWeight: 800 }}>{value}</p>
            </div>
        </div>
    );
}
