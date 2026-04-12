/* eslint-disable */
'use client';
import React, { useEffect, useState } from 'react';
import { Plus, Search, Eye, Edit2, Trash2, Bus, Car, Truck, X, Wrench, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../lib/excelUtils';
import { fetchWithAuth } from '../lib/api';
import Modal from './Modal';
import toast from 'react-hot-toast';

const TYPE_ICONS: Record<string, React.ReactNode> = {
    bus: <Bus size={16} />,
    minibus: <Truck size={16} />,
    taxi: <Car size={16} />,
};

export default function VehiclesManagement({ search, setSearch }: any) {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatut, setFilterStatut] = useState('all');

    // Modals
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editVehicle, setEditVehicle] = useState<any>(null);
    const [viewVehicle, setViewVehicle] = useState<any>(null);
    const [viewLoading, setViewLoading] = useState(false);

    // Form state (ajout)
    const [addForm, setAddForm] = useState({
        immatriculation: '', type: 'bus', capacite: 60, statut: 'actif', kilometrage: 0,
        date_acquisition: new Date().toISOString().split('T')[0]
    });

    // Form state (édition)
    const [editForm, setEditForm] = useState<any>({});

    useEffect(() => { loadVehicles(); }, [filterStatut]);

    async function loadVehicles() {
        setLoading(true);
        const url = filterStatut !== 'all' ? `/vehicules_custom?statut=${filterStatut}` : '/vehicules_custom';
        const res = await fetchWithAuth(url);
        if (res.ok) setVehicles(await res.json());
        setLoading(false);
    }

    async function openView(id: number) {
        setViewLoading(true);
        setViewVehicle({ loading: true });
        const res = await fetchWithAuth(`/vehicules_custom/${id}`);
        if (res.ok) setViewVehicle(await res.json());
        else setViewVehicle(null);
        setViewLoading(false);
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetchWithAuth('/vehicules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(addForm)
        });
        if (res.ok) {
            toast.success('Véhicule ajouté avec succès !');
            setIsAddOpen(false);
            setAddForm({ immatriculation: '', type: 'bus', capacite: 60, statut: 'actif', kilometrage: 0, date_acquisition: new Date().toISOString().split('T')[0] });
            loadVehicles();
        } else toast.error("Erreur lors de l'ajout.");
    }

    async function handleEdit(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetchWithAuth(`/vehicules_custom/${editVehicle.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editForm)
        });
        if (res.ok) {
            toast.success('Véhicule mis à jour !');
            setEditVehicle(null);
            loadVehicles();
        } else toast.error('Erreur lors de la mise à jour.');
    }

    async function handleDelete(id: number, immat: string) {
        if (!confirm(`Supprimer le véhicule ${immat} ?`)) return;
        const res = await fetchWithAuth(`/vehicules/${id}`, { method: 'DELETE' });
        if (res.ok) { toast.success('Véhicule supprimé'); loadVehicles(); }
        else toast.error('Suppression impossible.');
    }

    function openEdit(v: any) {
        setEditVehicle(v);
        setEditForm({ immatriculation: v.immatriculation, type: v.type, capacite: v.capacite, statut: v.statut, kilometrage: v.kilometrage });
    }

    const filtered = vehicles.filter(v =>
        v.immatriculation.toLowerCase().includes(search.toLowerCase()) ||
        v.type.toLowerCase().includes(search.toLowerCase())
    );

    const statutColors: Record<string, string> = {
        actif: 'success', maintenance: 'warning', hors_service: 'danger'
    };

    return (
        <div className="animate-up">
            {/* TOOLBAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input
                            type="text"
                            placeholder="Plaque ou type..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: '38px' }}
                        />
                    </div>
                    <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={{ width: '180px' }}>
                        <option value="all">Tous les statuts</option>
                        <option value="actif">Actifs</option>
                        <option value="maintenance">En maintenance</option>
                        <option value="hors_service">Hors service</option>
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-secondary" onClick={() => exportToExcel(filtered, 'Flotte_Vehicules_TranspoBot')}>
                        <FileSpreadsheet size={18} /> Excel
                    </button>
                    <button className="btn-primary" onClick={() => setIsAddOpen(true)}>
                        <Plus size={18} /> Ajouter un Véhicule
                    </button>
                </div>
            </div>

            {/* TABLE */}
            <div className="card" style={{ padding: 0 }}>
                <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Immatriculation</th>
                                <th>Type</th>
                                <th>Capacité</th>
                                <th>Kilométrage</th>
                                <th>Statut</th>
                                <th>Dernière Maint.</th>
                                <th>Prochaine Maint.</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Aucun véhicule trouvé.</td></tr>
                            ) : filtered.map(v => (
                                <tr key={v.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ background: 'var(--primary-light)', padding: '6px', borderRadius: '6px', color: 'var(--primary)' }}>
                                                {TYPE_ICONS[v.type] || <Bus size={16} />}
                                            </div>
                                            <span style={{ fontWeight: 700 }}>{v.immatriculation}</span>
                                        </div>
                                    </td>
                                    <td style={{ textTransform: 'capitalize', color: 'var(--text-muted)', fontSize: '13px' }}>{v.type}</td>
                                    <td>{v.capacite} places</td>
                                    <td style={{ fontSize: '13px' }}>{v.kilometrage?.toLocaleString('fr-FR')} km</td>
                                    <td>
                                        <span className={`badge badge-${statutColors[v.statut] || 'gray'}`}>
                                            {v.statut === 'hors_service' ? 'Hors service' : v.statut}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                        {v.derniere_maintenance ? new Date(v.derniere_maintenance).toLocaleDateString('fr-FR') : '—'}
                                    </td>
                                    <td style={{ fontSize: '13px' }}>
                                        {v.prochaine_maintenance ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warning)' }}>
                                                <Wrench size={13} />
                                                {new Date(v.prochaine_maintenance).toLocaleDateString('fr-FR')}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                            <button className="icon-btn" title="Voir détails" onClick={() => openView(v.id)}><Eye size={15} /></button>
                                            <button className="icon-btn" title="Modifier" onClick={() => openEdit(v)}><Edit2 size={15} /></button>
                                            <button className="icon-btn danger" title="Supprimer" onClick={() => handleDelete(v.id, v.immatriculation)} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL AJOUT */}
            <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Nouveau Véhicule">
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Immatriculation *</label>
                            <input type="text" placeholder="ex: DK-1234-AA" required value={addForm.immatriculation} onChange={e => setAddForm({ ...addForm, immatriculation: e.target.value })} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Type *</label>
                            <select value={addForm.type} onChange={e => setAddForm({ ...addForm, type: e.target.value, capacite: e.target.value === 'bus' ? 60 : e.target.value === 'minibus' ? 25 : 5 })}>
                                <option value="bus">Bus (60p)</option>
                                <option value="minibus">Minibus (25p)</option>
                                <option value="taxi">Taxi (5p)</option>
                            </select></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Capacité</label>
                            <input type="number" required value={addForm.capacite} onChange={e => setAddForm({ ...addForm, capacite: +e.target.value })} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Kilométrage</label>
                            <input type="number" value={addForm.kilometrage} onChange={e => setAddForm({ ...addForm, kilometrage: +e.target.value })} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Statut</label>
                            <select value={addForm.statut} onChange={e => setAddForm({ ...addForm, statut: e.target.value })}>
                                <option value="actif">Actif</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="hors_service">Hors Service</option>
                            </select></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Date Acquisition</label>
                            <input type="date" value={addForm.date_acquisition} onChange={e => setAddForm({ ...addForm, date_acquisition: e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button type="button" className="btn-secondary" onClick={() => setIsAddOpen(false)}>Annuler</button>
                        <button type="submit" className="btn-primary">Enregistrer</button>
                    </div>
                </form>
            </Modal>

            {/* MODAL ÉDITION */}
            <Modal isOpen={!!editVehicle} onClose={() => setEditVehicle(null)} title={`Modifier — ${editVehicle?.immatriculation}`}>
                <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Immatriculation</label>
                            <input type="text" value={editForm.immatriculation || ''} onChange={e => setEditForm({ ...editForm, immatriculation: e.target.value })} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Statut</label>
                            <select value={editForm.statut || ''} onChange={e => setEditForm({ ...editForm, statut: e.target.value })}>
                                <option value="actif">Actif</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="hors_service">Hors Service</option>
                            </select></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Capacité</label>
                            <input type="number" value={editForm.capacite || ''} onChange={e => setEditForm({ ...editForm, capacite: +e.target.value })} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Kilométrage</label>
                            <input type="number" value={editForm.kilometrage || ''} onChange={e => setEditForm({ ...editForm, kilometrage: +e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button type="button" className="btn-secondary" onClick={() => setEditVehicle(null)}>Annuler</button>
                        <button type="submit" className="btn-primary">Sauvegarder</button>
                    </div>
                </form>
            </Modal>

            {/* MODAL DÉTAIL */}
            <Modal isOpen={!!viewVehicle} onClose={() => setViewVehicle(null)} title="Détail du Véhicule">
                {viewVehicle?.loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
                ) : viewVehicle && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Infos véhicule */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {[
                                ['Immatriculation', viewVehicle.vehicule?.immatriculation],
                                ['Type', viewVehicle.vehicule?.type],
                                ['Capacité', `${viewVehicle.vehicule?.capacite} places`],
                                ['Kilométrage', `${viewVehicle.vehicule?.kilometrage?.toLocaleString('fr-FR')} km`],
                                ['Statut', viewVehicle.vehicule?.statut],
                                ['Acquisition', viewVehicle.vehicule?.date_acquisition],
                            ].map(([label, value]) => (
                                <div key={label} style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px' }}>
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
                                    <p style={{ fontWeight: 700, marginTop: '4px', textTransform: 'capitalize' }}>{value || '—'}</p>
                                </div>
                            ))}
                        </div>
                        {/* Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                            <div style={{ textAlign: 'center', background: 'var(--primary-light)', padding: '12px', borderRadius: '8px' }}>
                                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>{viewVehicle.stats?.trajets_total}</p>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Trajets</p>
                            </div>
                            <div style={{ textAlign: 'center', background: 'var(--success-light)', padding: '12px', borderRadius: '8px' }}>
                                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--success)' }}>{((viewVehicle.stats?.recette_totale || 0) / 1000).toFixed(0)}k</p>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>FCFA</p>
                            </div>
                            <div style={{ textAlign: 'center', background: 'var(--info-light)', padding: '12px', borderRadius: '8px' }}>
                                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--info)' }}>{viewVehicle.stats?.moy_passagers}</p>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Moy. passagers</p>
                            </div>
                        </div>
                        {/* Historique maintenance */}
                        {viewVehicle.maintenances?.length > 0 && (
                            <div>
                                <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>Historique Maintenance</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                    {viewVehicle.maintenances.map((m: any) => (
                                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', fontSize: '13px' }}>
                                            <span><strong>{m.type}</strong> — {m.description.slice(0, 40)}...</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span className={`badge badge-${m.effectuee ? 'success' : 'warning'}`} style={{ fontSize: '10px' }}>{m.effectuee ? '✓' : '⏳'}</span>
                                                {(m.cout / 1000).toFixed(0)}k FCFA
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
