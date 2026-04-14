import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Tag, CreditCard, FileSpreadsheet } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { exportToExcel } from '../lib/excelUtils';
import Modal from './Modal';
import { Card, Button, Input, Badge, DataTable } from './ui';
import { useToast } from './ui/Toast';

export default function FaresManagement({ search, setSearch }: any) {
    const [fares, setFares] = useState<any[]>([]);
    const [lines, setLines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        ligne_id: 0, type_client: 'Plein tarif', prix: 0
    });

    useEffect(() => { 
        loadFares();
        loadLines();
    }, []);

    async function loadFares() {
        setLoading(true);
        try {
            const res = await fetchWithAuth('/tarifs');
            if (res.ok) setFares(await res.json());
        } catch (e) {
            toast.error("Erreur", "Impossible de charger les tarifs.");
        } finally {
            setLoading(false);
        }
    }

    async function loadLines() {
        try {
            const res = await fetchWithAuth('/lignes');
            if (res.ok) {
                const data = await res.json();
                setLines(data);
                if (data.length > 0) setFormData(prev => ({ ...prev, ligne_id: data[0].id }));
            }
        } catch (e) {}
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (formData.ligne_id === 0) {
            toast.warning("Champs requis", "Veuillez sélectionner une ligne.");
            return;
        }
        
        const res = await fetchWithAuth('/tarifs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (res.ok) {
            toast.success('Succès', 'Tarif enregistré avec succès.');
            setIsModalOpen(false);
            setFormData({ ...formData, prix: 0 });
            loadFares();
        } else toast.error("Erreur", "Impossible de créer le tarif.");
    }

    async function handleDelete(id: number) {
        if (!confirm(`Supprimer ce tarif ?`)) return;
        const res = await fetchWithAuth(`/tarifs/${id}`, { method: 'DELETE' });
        if (res.ok) { 
            toast.success('Supprimé', 'Tarif retiré du catalogue.'); 
            loadFares(); 
        } else toast.error('Erreur', 'La suppression a échoué.');
    }

    function getLineCode(id: number) {
        const l = lines.find(line => line.id === id);
        return l ? l.code : 'Ligne inconnue';
    }

    const columns = [
        {
            key: 'ligne_id',
            label: 'Réseau / Ligne',
            render: (v: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: 'var(--primary-light)', padding: '6px', borderRadius: '8px', color: 'var(--primary)' }}>
                        <Tag size={16} />
                    </div>
                    <div>
                        <p style={{ fontWeight: 700, fontSize: '14px' }}>{getLineCode(v)}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lines.find(l => l.id === v)?.nom || '—'}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'type_client',
            label: 'Catégorie Clientèle',
            render: (v: any) => <span style={{ fontWeight: 600 }}>{v}</span>
        },
        {
            key: 'prix',
            label: 'Tarification (FCFA)',
            render: (v: any) => <Badge variant="primary" size="lg" style={{ fontWeight: 800 }}>{v.toLocaleString('fr-FR')} FCFA</Badge>
        },
        {
            key: 'id',
            label: 'Actions',
            style: { textAlign: 'right' as const },
            render: (v: any) => (
                <Button variant="ghost" size="sm" onClick={() => handleDelete(v)} style={{ color: 'var(--danger)' }}>
                    <Trash2 size={16} />
                </Button>
            )
        }
    ];

    return (
        <div className="animate-up">
            <Card padding="none">
                <DataTable 
                    title="Grille Tarifaire"
                    subtitle="Gestion multicritère des tarifs par ligne et type de clientèle"
                    columns={columns}
                    data={fares.filter(f =>
                        f.type_client.toLowerCase().includes(search.toLowerCase()) ||
                        getLineCode(f.ligne_id).toLowerCase().includes(search.toLowerCase())
                    )}
                    loading={loading}
                    onSearch={setSearch}
                    searchPlaceholder="Chercher un tarif ou une ligne..."
                    actions={
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button variant="outline" size="md" onClick={() => exportToExcel(fares, 'Tarification_TranspoBot')}>
                                <FileSpreadsheet size={18} />
                            </Button>
                            <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
                                <Plus size={18} /> Définir un Tarif
                            </Button>
                        </div>
                    }
                />
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nouveau Paramètre Tarifaire">
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Section du Réseau *</label>
                        <select 
                            value={formData.ligne_id} 
                            onChange={e => setFormData({ ...formData, ligne_id: +e.target.value })}
                            style={{ height: '42px' }}
                        >
                            <option value={0} disabled>Sélectionner une ligne</option>
                            {lines.map(l => (
                                <option key={l.id} value={l.id}>{l.code} — {l.nom}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cible Clientèle *</label>
                        <select 
                            value={formData.type_client} 
                            onChange={e => setFormData({ ...formData, type_client: e.target.value })}
                            style={{ height: '42px' }}
                        >
                            <option value="Plein tarif">Plein tarif</option>
                            <option value="Étudiant">Accès Étudiant (Tarif Réduit)</option>
                            <option value="Pupille">Pupille de la Nation</option>
                            <option value="Sénior">Troisième âge (+60 ans)</option>
                            <option value="Enfant">Junior (-10 ans)</option>
                        </select>
                    </div>
                    <Input 
                        label="Valeur Nominale (FCFA) *" 
                        type="number" 
                        required 
                        value={formData.prix} 
                        onChange={(e: any) => setFormData({ ...formData, prix: +e.target.value })} 
                        icon={<CreditCard size={16} />}
                    />
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                        <Button variant="primary" type="submit">Valider le Tarif</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
