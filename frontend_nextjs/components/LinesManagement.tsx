/* eslint-disable */
'use client';
import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, MapPin, Navigation, Clock, FileSpreadsheet } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { exportToExcel } from '../lib/excelUtils';
import Modal from './Modal';
import toast from 'react-hot-toast';

export default function LinesManagement({ search, setSearch }: any) {
    const [lines, setLines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addForm, setAddForm] = useState({
        code: '', nom: '', origine: '', destination: '', distance_km: 0, duree_minutes: 0
    });

    useEffect(() => { loadLines(); }, []);

    async function loadLines() {
        setLoading(true);
        const res = await fetchWithAuth('/lignes');
        if (res.ok) setLines(await res.json());
        setLoading(false);
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetchWithAuth('/lignes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(addForm)
        });
        if (res.ok) {
            toast.success('Ligne ajoutée avec succès !');
            setIsAddOpen(false);
            setAddForm({ code: '', nom: '', origine: '', destination: '', distance_km: 0, duree_minutes: 0 });
            loadLines();
        } else toast.error("Erreur lors de l'ajout.");
    }

    async function handleDelete(id: number, code: string) {
        if (!confirm(`Supprimer la ligne ${code} ? cela impactera les trajets liés.`)) return;
        const res = await fetchWithAuth(`/lignes/${id}`, { method: 'DELETE' });
        if (res.ok) { toast.success('Ligne supprimée'); loadLines(); }
        else toast.error('Suppression impossible.');
    }

    const filtered = lines.filter(l =>
        l.code.toLowerCase().includes(search.toLowerCase()) ||
        l.nom.toLowerCase().includes(search.toLowerCase()) ||
        l.origine.toLowerCase().includes(search.toLowerCase()) ||
        l.destination.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="animate-up">
            {/* TOOLBAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input
                            type="text"
                            placeholder="Rechercher une ligne..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: '38px' }}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-secondary" onClick={() => exportToExcel(filtered, 'Liste_Lignes_TranspoBot')}>
                        <FileSpreadsheet size={18} /> Excel
                    </button>
                    <button className="btn-primary" onClick={() => setIsAddOpen(true)}>
                        <Plus size={18} /> Nouvelle Ligne
                    </button>
                </div>
            </div>

            {/* TABLE */}
            <div className="card" style={{ padding: 0 }}>
                <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Nom de la Ligne</th>
                                <th>Itinéraire</th>
                                <th>Distance</th>
                                <th>Durée Est.</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Aucune ligne trouvée.</td></tr>
                            ) : filtered.map(l => (
                                <tr key={l.id}>
                                    <td><span className="badge badge-info" style={{ fontWeight: 700 }}>{l.code}</span></td>
                                    <td style={{ fontWeight: 600 }}>{l.nom}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                            <MapPin size={14} color="var(--primary)" />
                                            <span>{l.origine}</span>
                                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                                            <span>{l.destination}</span>
                                        </div>
                                    </td>
                                    <td>{l.distance_km} km</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                            <Clock size={14} />
                                            {l.duree_minutes} min
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="icon-btn danger" title="Supprimer" onClick={() => handleDelete(l.id, l.code)} style={{ color: 'var(--danger)' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL AJOUT */}
            <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Créer une Nouvelle Ligne">
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                        <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Code *</label>
                            <input type="text" placeholder="ex: L01" required value={addForm.code} onChange={e => setAddForm({ ...addForm, code: e.target.value })} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nom complet *</label>
                            <input type="text" placeholder="ex: Dakar PFA" required value={addForm.nom} onChange={e => setAddForm({ ...addForm, nom: e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Origine *</label>
                            <input type="text" placeholder="Lieu de départ" required value={addForm.origine} onChange={e => setAddForm({ ...addForm, origine: e.target.value })} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Destination *</label>
                            <input type="text" placeholder="Lieu d'arrivée" required value={addForm.destination} onChange={e => setAddForm({ ...addForm, destination: e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Distance (km) *</label>
                            <input type="number" step="0.1" required value={addForm.distance_km} onChange={e => setAddForm({ ...addForm, distance_km: +e.target.value })} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Durée estimée (min) *</label>
                            <input type="number" required value={addForm.duree_minutes} onChange={e => setAddForm({ ...addForm, duree_minutes: +e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button type="button" className="btn-secondary" onClick={() => setIsAddOpen(false)}>Annuler</button>
                        <button type="submit" className="btn-primary">Enregistrer</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
