import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, MapPin, Navigation, Clock, FileSpreadsheet, Activity } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { exportToExcel } from '../lib/excelUtils';
import Modal from './Modal';
import { Card, Button, Input, Badge, DataTable } from './ui';
import { useToast } from './ui/Toast';

export default function LinesManagement({ search, setSearch }: any) {
    const [lines, setLines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();
    
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addForm, setAddForm] = useState({
        code: '', nom: '', origine: '', destination: '', distance_km: 0, duree_minutes: 0
    });

    useEffect(() => { loadLines(); }, []);

    async function loadLines() {
        setLoading(true);
        try {
            const res = await fetchWithAuth('/lignes');
            if (res.ok) setLines(await res.json());
        } catch (e) {
            toast.error("Erreur", "Chargement des lignes échoué.");
        } finally {
            setLoading(false);
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetchWithAuth('/lignes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(addForm)
        });
        if (res.ok) {
            toast.success('Succès', 'Ligne ajoutée au réseau !');
            setIsAddOpen(false);
            setAddForm({ code: '', nom: '', origine: '', destination: '', distance_km: 0, duree_minutes: 0 });
            loadLines();
        } else toast.error("Erreur", "L'ajout a échoué.");
    }

    async function handleDelete(id: number, code: string) {
        if (!confirm(`Supprimer la ligne ${code} ? Cela impactera tous les trajets associés.`)) return;
        const res = await fetchWithAuth(`/lignes/${id}`, { method: 'DELETE' });
        if (res.ok) { 
            toast.success('Supprimé', 'Ligne retirée du réseau.'); 
            loadLines(); 
        } else toast.error('Erreur', 'Impossible de supprimer cette ligne.');
    }

    const columns = [
        { 
            key: 'code', 
            label: 'ID / Code', 
            render: (v: any) => <Badge variant="info" size="sm" style={{ fontWeight: 800 }}>{v}</Badge> 
        },
        { 
            key: 'nom', 
            label: 'Nom de la Ligne', 
            render: (v: any) => <span style={{ fontWeight: 700 }}>{v}</span> 
        },
        { 
            key: 'origine', 
            label: 'Itinéraire', 
            render: (v: any, row: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 500 }}>{v}</span>
                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                    <span style={{ fontWeight: 500 }}>{row.destination}</span>
                </div>
            )
        },
        { 
            key: 'distance_km', 
            label: 'Distance', 
            render: (v: any) => <span>{v} km</span> 
        },
        { 
            key: 'duree_minutes', 
            label: 'Temps Estimé', 
            render: (v: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                    <Clock size={14} />
                    <span>{v} min</span>
                </div>
            )
        },
        { 
            key: 'id', 
            label: 'Actions', 
            style: { textAlign: 'right' as const },
            render: (v: any, row: any) => (
                <Button variant="ghost" size="sm" onClick={() => handleDelete(v, row.code)} style={{ color: 'var(--danger)' }}>
                    <Trash2 size={16} />
                </Button>
            )
        }
    ];

    return (
        <div className="animate-up">
            <Card padding="none">
                <DataTable 
                    title="Cartographie des Lignes"
                    subtitle="Gestion des axes de transport du réseau"
                    columns={columns}
                    data={lines.filter(l =>
                        (l.code?.toLowerCase() || '').includes(search.toLowerCase()) ||
                        (l.nom?.toLowerCase() || '').includes(search.toLowerCase()) ||
                        (l.origine?.toLowerCase() || '').includes(search.toLowerCase()) ||
                        (l.destination?.toLowerCase() || '').includes(search.toLowerCase())
                    )}
                    loading={loading}
                    onSearch={setSearch}
                    searchPlaceholder="Code, ville, nom..."
                    actions={
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button variant="outline" size="md" onClick={() => exportToExcel(lines, 'Liste_Lignes')}>
                                <FileSpreadsheet size={18} />
                            </Button>
                            <Button variant="primary" size="md" onClick={() => setIsAddOpen(true)}>
                                <Plus size={18} /> Nouvelle Ligne
                            </Button>
                        </div>
                    }
                />
            </Card>

            <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Ajouter une Ligne au Réseau">
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                        <Input label="Code Ligne" placeholder="ex: L01" required value={addForm.code} onChange={(e: any) => setAddForm({ ...addForm, code: e.target.value })} />
                        <Input label="Désignation" placeholder="ex: Express Plateau" required value={addForm.nom} onChange={(e: any) => setAddForm({ ...addForm, nom: e.target.value })} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Input label="Ville de Départ" placeholder="Origine" required value={addForm.origine} onChange={(e: any) => setAddForm({ ...addForm, origine: e.target.value })} />
                        <Input label="Ville d'Arrivée" placeholder="Destination" required value={addForm.destination} onChange={(e: any) => setAddForm({ ...addForm, destination: e.target.value })} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Input label="Distance (KM)" type="number" step="0.1" required value={addForm.distance_km} onChange={(e: any) => setAddForm({ ...addForm, distance_km: +e.target.value })} />
                        <Input label="Temps (MIN)" type="number" required value={addForm.duree_minutes} onChange={(e: any) => setAddForm({ ...addForm, duree_minutes: +e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Annuler</Button>
                        <Button variant="primary" type="submit">Valider la Création</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
