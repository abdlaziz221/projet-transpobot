/* eslint-disable */
'use client';
import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Tag, CreditCard, Filter, FileSpreadsheet } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { exportToExcel } from '../lib/excelUtils';
import Modal from './Modal';
import toast from 'react-hot-toast';

export default function FaresManagement({ search, setSearch }: any) {
    const [fares, setFares] = useState<any[]>([]);
    const [lines, setLines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addForm, setAddForm] = useState({
        ligne_id: 0, type_client: 'Plein tarif', prix: 0
    });

    useEffect(() => { 
        loadFares();
        loadLines();
    }, []);

    async function loadFares() {
        setLoading(true);
        const res = await fetchWithAuth('/tarifs');
        if (res.ok) setFares(await res.json());
        setLoading(false);
    }

    async function loadLines() {
        const res = await fetchWithAuth('/lignes');
        if (res.ok) {
            const data = await res.json();
            setLines(data);
            if (data.length > 0) setAddForm(prev => ({ ...prev, ligne_id: data[0].id }));
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (addForm.ligne_id === 0) return toast.error("Veuillez sélectionner une ligne.");
        
        const res = await fetchWithAuth('/tarifs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(addForm)
        });
        if (res.ok) {
            toast.success('Tarif ajouté avec succès !');
            setIsAddOpen(false);
            setAddForm({ ...addForm, prix: 0 });
            loadFares();
        } else toast.error("Erreur lors de l'ajout.");
    }

    async function handleDelete(id: number) {
        if (!confirm(`Supprimer ce tarif ?`)) return;
        const res = await fetchWithAuth(`/tarifs/${id}`, { method: 'DELETE' });
        if (res.ok) { toast.success('Tarif supprimé'); loadFares(); }
        else toast.error('Suppression impossible.');
    }

    function getLineCode(id: number) {
        const l = lines.find(line => line.id === id);
        return l ? l.code : 'Ligne inconnue';
    }

    const filtered = fares.filter(f =>
        f.type_client.toLowerCase().includes(search.toLowerCase()) ||
        getLineCode(f.ligne_id).toLowerCase().includes(search.toLowerCase())
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
                            placeholder="Type de client ou ligne..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: '38px' }}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-secondary" onClick={() => exportToExcel(filtered, 'Tarification_TranspoBot')}>
                        <FileSpreadsheet size={18} /> Excel
                    </button>
                    <button className="btn-primary" onClick={() => setIsAddOpen(true)}>
                        <Plus size={18} /> Nouveau Tarif
                    </button>
                </div>
            </div>

            {/* TABLE */}
            <div className="card" style={{ padding: 0 }}>
                <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Ligne</th>
                                <th>Type de Client</th>
                                <th>Prix (FCFA)</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '48px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Aucun tarif défini.</td></tr>
                            ) : filtered.map(f => (
                                <tr key={f.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ background: 'var(--info-light)', padding: '6px', borderRadius: '6px', color: 'var(--info)' }}>
                                                <Tag size={16} />
                                            </div>
                                            <span style={{ fontWeight: 700 }}>{getLineCode(f.ligne_id)}</span>
                                        </div>
                                    </td>
                                    <td>{f.type_client}</td>
                                    <td style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '15px' }}>
                                        {f.prix.toLocaleString('fr-FR')} FCFA
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="icon-btn danger" title="Supprimer" onClick={() => handleDelete(f.id)} style={{ color: 'var(--danger)' }}>
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
            <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Définir un Nouveau Tarif">
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Ligne Concernée *</label>
                        <select value={addForm.ligne_id} onChange={e => setAddForm({ ...addForm, ligne_id: +e.target.value })}>
                            <option value={0} disabled>Sélectionner une ligne</option>
                            {lines.map(l => (
                                <option key={l.id} value={l.id}>{l.code} - {l.nom}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Type de Client *</label>
                        <select value={addForm.type_client} onChange={e => setAddForm({ ...addForm, type_client: e.target.value })}>
                            <option value="Plein tarif">Plein tarif</option>
                            <option value="Étudiant">Étudiant (Carte requise)</option>
                            <option value="Pupille">Pupille de la Nation</option>
                            <option value="Sénior">Troisième âge</option>
                            <option value="Enfant">Enfant (-10 ans)</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Prix (en FCFA) *</label>
                        <div style={{ position: 'relative' }}>
                            <CreditCard size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input type="number" required value={addForm.prix} onChange={e => setAddForm({ ...addForm, prix: +e.target.value })} style={{ paddingLeft: '38px' }} />
                        </div>
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
