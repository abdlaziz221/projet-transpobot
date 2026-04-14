import React, { useEffect, useState } from 'react';
import { Wrench, AlertTriangle, CheckCircle, Clock, Plus, Check, Calendar, Trash2, Truck, ExternalLink } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import Modal from './Modal';
import { Card, Button, Input, Badge, DataTable } from './ui';
import { useToast } from './ui/Toast';

export default function MaintenanceManagement({ search, setSearch }: any) {
    const [maintenances, setMaintenances] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filterEffectuee, setFilterEffectuee] = useState<string>('all');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const toast = useToast();

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
            toast.error("Erreur", "Impossible de charger la maintenance.");
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
            toast.success('Opération réussie', 'Maintenance planifiée avec succès.');
            setIsAddOpen(false);
            setAddForm({ vehicule_id: 1, type: 'Vidange', description: '', date_prevue: new Date().toISOString().split('T')[0], cout: 0, effectuee: false });
            loadAll();
        } else toast.error("Erreur", "La planification a échoué.");
    }

    async function markComplete(id: number, vehicule: string) {
        if (!confirm(`Marquer la maintenance de ${vehicule} comme effectuée aujourd'hui ?`)) return;
        const res = await fetchWithAuth(`/maintenance_custom/${id}/complete`, { method: 'PATCH' });
        if (res.ok) {
            toast.success('Terminé', 'Carnet de bord du véhicule mis à jour.');
            loadAll();
        } else toast.error('Erreur', 'Impossible de valider cette maintenance.');
    }

    async function handleDelete(id: number) {
        if (!confirm("Supprimer cette planification de maintenance ?")) return;
        const res = await fetchWithAuth(`/maintenance/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success("Supprimé", "Entrée de maintenance retirée.");
            loadAll();
        } else toast.error("Erreur", "Échec de la suppression.");
    }

    const alerts = stats?.maintenances_en_attente || 0;
    const enRetard = maintenances.filter(m => m.en_retard).length;
    const effectueeCount = maintenances.filter(m => m.effectuee).length;
    const coutTotal = maintenances.filter(m => m.effectuee).reduce((s, m) => s + m.cout, 0);

    const columns = [
        {
            key: 'vehicule',
            label: 'Véhicule',
            render: (v: any, row: any) => (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Truck size={14} color="var(--primary)" />
                        <span style={{ fontWeight: 700 }}>{v}</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize', marginLeft: '22px' }}>{row.type_vehicule}</p>
                </div>
            )
        },
        {
            key: 'type',
            label: 'Type Opération',
            render: (v: any) => <Badge variant="info">{v}</Badge>
        },
        {
            key: 'description',
            label: 'Observations',
            render: (v: any) => <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</p>
        },
        {
            key: 'date_prevue',
            label: 'Échéance',
            render: (v: any, row: any) => (
                <div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: row.en_retard ? 'var(--danger)' : 'var(--text-main)', fontSize: '13px', fontWeight: 600 }}>
                        <Calendar size={14} />
                        {v ? new Date(v).toLocaleDateString('fr-FR') : '—'}
                    </div>
                    {row.jours_restants !== null && !row.effectuee && (
                        <p style={{ fontSize: '10px', color: row.en_retard ? 'var(--danger)' : row.jours_restants <= 7 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 700, marginLeft: '20px' }}>
                            {row.en_retard ? `(${Math.abs(row.jours_restants)}j de retard)` : `(J-${row.jours_restants})`}
                        </p>
                    )}
                </div>
            )
        },
        {
            key: 'cout',
            label: 'Budget',
            render: (v: any) => <span style={{ fontWeight: 700 }}>{v.toLocaleString()} <span style={{ fontSize: '9px', opacity: 0.6 }}>FCFA</span></span>
        },
        {
            key: 'effectuee',
            label: 'Statut',
            render: (v: any, row: any) => (
                <Badge variant={v ? 'success' : row.en_retard ? 'danger' : 'warning'}>
                    {v ? 'Effectuée' : row.en_retard ? 'En Retard' : 'À Faire'}
                </Badge>
            )
        },
        {
            key: 'id',
            label: 'Actions',
            style: { textAlign: 'right' as const },
            render: (v: any, row: any) => (
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    {!row.effectuee && (
                        <Button variant="ghost" size="sm" onClick={() => markComplete(v, row.vehicule)}>
                            <Check size={16} color="var(--success)" />
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(v)} style={{ color: 'var(--danger)' }}>
                        <Trash2 size={16} />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="animate-up">
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <MaintKPI label="Opérations à Venir" value={alerts} icon={<Clock />} color="var(--warning)" />
                <MaintKPI label="Urgences / Retards" value={enRetard} icon={<AlertTriangle />} color="var(--danger)" />
                <MaintKPI label="Opérations Closes" value={effectueeCount} icon={<CheckCircle />} color="var(--success)" />
                <MaintKPI label="Coût Net cumulé" value={`${(coutTotal / 1000).toFixed(0)}k`} icon={<Wrench />} color="var(--primary)" />
            </div>

            <Card padding="none">
                 <DataTable 
                    title="Registre de Maintenance"
                    subtitle="Suivi technique et préventif de la flotte"
                    columns={columns}
                    data={maintenances.filter(m => 
                        (m.vehicule?.toLowerCase() || '').includes(search.toLowerCase()) || 
                        (m.type?.toLowerCase() || '').includes(search.toLowerCase()) ||
                        (m.description?.toLowerCase() || '').includes(search.toLowerCase())
                    )}
                    loading={loading}
                    onSearch={setSearch}
                    searchPlaceholder="Immatriculation, type..."
                    actions={
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select 
                                value={filterEffectuee} 
                                onChange={e => setFilterEffectuee(e.target.value)} 
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}
                            >
                                <option value="all">Tout le registre</option>
                                <option value="non">À faire uniquement</option>
                                <option value="oui">Historique (clôturées)</option>
                            </select>
                            <Button variant="primary" size="md" onClick={() => setIsAddOpen(true)}>
                                <Plus size={18} /> Planifier
                            </Button>
                        </div>
                    }
                />
            </Card>

            <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Créer une Fiche de Maintenance">
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Véhicule Cible *</label>
                        <select 
                            value={addForm.vehicule_id} 
                            onChange={e => setAddForm({ ...addForm, vehicule_id: +e.target.value })}
                            style={{ height: '42px' }}
                        >
                            {vehicles.map((v: any) => (
                                <option key={v.id} value={v.id}>{v.immatriculation} ({v.type})</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type Intervention *</label>
                            <select 
                                value={addForm.type} 
                                onChange={e => setAddForm({ ...addForm, type: e.target.value })}
                                style={{ height: '42px' }}
                            >
                                <option value="Vidange">Vidange standard</option>
                                <option value="Révision">Révision complète</option>
                                <option value="Pneumatiques">Changement pneus</option>
                                <option value="Freins">Système de freinage</option>
                                <option value="Moteur">Mécanique moteur</option>
                                <option value="Carrosserie">Carrosserie / Peinture</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date Prévue *</label>
                            <Input type="date" required value={addForm.date_prevue} onChange={(e:any) => setAddForm({ ...addForm, date_prevue: e.target.value })} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Observations Techniques *</label>
                        <textarea 
                            rows={3} 
                            required 
                            value={addForm.description} 
                            onChange={e => setAddForm({ ...addForm, description: e.target.value })} 
                            placeholder="Détails des travaux..."
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', resize: 'none' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estimation Budgétaire (FCFA)</label>
                        <Input type="number" value={addForm.cout} onChange={(e:any) => setAddForm({ ...addForm, cout: +e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Annuler</Button>
                        <Button variant="primary" type="submit">Valider le Planning</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function MaintKPI({ label, value, icon, color }: any) {
    return (
        <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderTop: `4px solid ${color}` }}>
            <div style={{ 
                width: '44px', height: '44px', borderRadius: '12px', 
                background: `${color}10`, color, 
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
                {React.cloneElement(icon, { size: 22 })}
            </div>
            <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</p>
                <p style={{ fontSize: '24px', fontWeight: 800 }}>{value}</p>
            </div>
        </Card>
    );
}
