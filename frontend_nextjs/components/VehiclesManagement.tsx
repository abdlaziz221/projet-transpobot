import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Search, Eye, Edit2, Trash2, Bus, Car, Truck, X, Wrench, AlertTriangle, FileSpreadsheet, Activity, Layers, CheckCircle, Clock, Users } from 'lucide-react';
import { exportToExcel } from '../lib/excelUtils';
import { fetchWithAuth } from '../lib/api';
import Modal from './Modal';
import { Button, Input, Badge, Card, DataTable } from './ui';
import { useToast } from './ui/Toast';

const TYPE_ICONS: Record<string, React.ReactNode> = {
    bus: <Bus size={18} />,
    minibus: <Truck size={18} />,
    taxi: <Car size={18} />,
};

const STATUT_VARIANTS: Record<string, any> = {
    actif: 'success',
    maintenance: 'warning',
    hors_service: 'danger'
};

export default function VehiclesManagement({ search, setSearch }: any) {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatut, setFilterStatut] = useState('all');
    const toast = useToast();

    // Modals
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editVehicle, setEditVehicle] = useState<any>(null);
    const [viewVehicle, setViewVehicle] = useState<any>(null);

    // Form states
    const [addForm, setAddForm] = useState({
        immatriculation: '', type: 'bus', capacite: 60, statut: 'actif', kilometrage: 0,
        date_acquisition: new Date().toISOString().split('T')[0]
    });
    const [editForm, setEditForm] = useState<any>({});

    useEffect(() => { loadVehicles(); }, [filterStatut]);

    async function loadVehicles() {
        setLoading(true);
        try {
            const url = filterStatut !== 'all' ? `/vehicules_custom?statut=${filterStatut}` : '/vehicules_custom';
            const res = await fetchWithAuth(url);
            if (res.ok) setVehicles(await res.json());
        } catch (e) {
            toast.error('Erreur', 'Impossible de charger la flotte');
        } finally {
            setLoading(false);
        }
    }

    async function openView(id: number) {
        setViewVehicle({ loading: true });
        try {
            const res = await fetchWithAuth(`/vehicules_custom/${id}`);
            if (res.ok) setViewVehicle(await res.json());
        } catch (e) {
            setViewVehicle(null);
            toast.error("Erreur", "Données du véhicule indisponibles.");
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetchWithAuth('/vehicules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(addForm)
        });
        if (res.ok) {
            toast.success('Succès', 'Véhicule ajouté à l\'inventaire !');
            setIsAddOpen(false);
            setAddForm({ immatriculation: '', type: 'bus', capacite: 60, statut: 'actif', kilometrage: 0, date_acquisition: new Date().toISOString().split('T')[0] });
            loadVehicles();
        } else toast.error('Erreur', "L'ajout a échoué.");
    }

    async function handleEdit(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetchWithAuth(`/vehicules_custom/${editVehicle.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editForm)
        });
        if (res.ok) {
            toast.success('Mis à jour', 'Fiche technique actualisée !');
            setEditVehicle(null);
            loadVehicles();
        } else toast.error('Erreur', 'Échec de la modification.');
    }

    async function handleDelete(id: number, immat: string) {
        if (!confirm(`Supprimer le véhicule ${immat} de l'inventaire ?`)) return;
        const res = await fetchWithAuth(`/vehicules/${id}`, { method: 'DELETE' });
        if (res.ok) { 
            toast.success('Supprimé', 'Véhicule retiré de la flotte.'); 
            loadVehicles(); 
        } else toast.error('Erreur', 'Action refusée par le système.');
    }

    const columns = useMemo(() => [
        {
            key: 'immatriculation',
            label: 'Matricule / Plaque',
            render: (val: string, row: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                        width: '36px', height: '36px',
                        background: 'var(--bg-subtle)', 
                        borderRadius: '10px', 
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {TYPE_ICONS[row.type] || <Bus size={18} />}
                    </div>
                    <span style={{ fontWeight: 800, letterSpacing: '0.02em', fontSize: '13.5px' }}>{val}</span>
                </div>
            )
        },
        { 
            key: 'type', 
            label: 'Modèle', 
            render: (v: string) => <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{v}</span> 
        },
        { 
            key: 'capacite', 
            label: 'Capacité', 
            render: (val: number) => <span style={{ fontWeight: 700 }}>{val} <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '11px' }}>Pax</span></span>
        },
        { 
            key: 'kilometrage', 
            label: 'Usage (KM)', 
            render: (val: number) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Activity size={12} color="var(--primary)" />
                    {val?.toLocaleString('fr-FR')}
                </div>
            )
        },
        { 
            key: 'statut', 
            label: 'État Opérationnel', 
            render: (val: string) => (
                <Badge variant={STATUT_VARIANTS[val] || 'gray'}>
                    {val === 'hors_service' ? 'Hors-Service' : val.charAt(0).toUpperCase() + val.slice(1)}
                </Badge>
            )
        },
        { 
            key: 'prochaine_maintenance', 
            label: 'Maintenance Prévue', 
            render: (val: string) => val ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warning-700)', fontWeight: 700, fontSize: '12.5px' }}>
                    <Wrench size={13} />
                    {new Date(val).toLocaleDateString('fr-FR')}
                </div>
            ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Non planifiée</span>
        },
        {
            key: 'id',
            label: 'Actions',
            style: { textAlign: 'right' as const },
            render: (v: any, row: any) => (
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="sm" onClick={() => openView(row.id)}><Eye size={16} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditVehicle(row); setEditForm(row); }}><Edit2 size={16} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id, row.immatriculation)} style={{ color: 'var(--danger)' }}><Trash2 size={16} /></Button>
                </div>
            )
        }
    ], []);

    return (
        <div className="animate-up">
            <Card padding="none">
                <DataTable 
                    title="Registre de la Flotte"
                    subtitle="Gestion technique et opérationnelle des véhicules"
                    data={vehicles}
                    columns={columns}
                    loading={loading}
                    onSearch={setSearch}
                    searchPlaceholder="Matricule, type de bus..."
                    actions={
                        <div style={{ display: 'flex', gap: '8px' }}>
                             <select 
                                value={filterStatut} 
                                onChange={e => setFilterStatut(e.target.value)}
                                style={{ 
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    fontSize: '13px',
                                    outline: 'none',
                                    minWidth: '160px'
                                }}
                            >
                                <option value="all">Tous les États</option>
                                <option value="actif">En Service</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="hors_service">Hors Service</option>
                            </select>
                            <Button variant="outline" size="md" onClick={() => exportToExcel(vehicles, 'Flotte_TranspoBot')}>
                                <FileSpreadsheet size={18} />
                            </Button>
                            <Button variant="primary" size="md" onClick={() => setIsAddOpen(true)}>
                                <Plus size={18} /> Ajouter
                            </Button>
                        </div>
                    }
                />
            </Card>

            <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Enregistrer un Véhicule">
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Input label="N° Immatriculation" placeholder="ex: DK-1234-A" required value={addForm.immatriculation} onChange={(e: any) => setAddForm({ ...addForm, immatriculation: e.target.value })} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type de Véhicule</label>
                            <select 
                                value={addForm.type} 
                                onChange={e => setAddForm({ ...addForm, type: e.target.value, capacite: e.target.value === 'bus' ? 60 : e.target.value === 'minibus' ? 25 : 5 })}
                                style={{ height: '42px' }}
                            >
                                <option value="bus">Autobus Grand Format (60p)</option>
                                <option value="minibus">Minibus / Sprinter (25p)</option>
                                <option value="taxi">Berline / Taxi (5p)</option>
                            </select>
                        </div>
                        <Input label="Capacité Passagers" type="number" required value={addForm.capacite} onChange={(e: any) => setAddForm({ ...addForm, capacite: +e.target.value })} />
                        <Input label="Kilométrage Actuel" type="number" value={addForm.kilometrage} onChange={(e: any) => setAddForm({ ...addForm, kilometrage: +e.target.value })} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>État Initial</label>
                            <select value={addForm.statut} onChange={e => setAddForm({ ...addForm, statut: e.target.value })} style={{ height: '42px' }}>
                                <option value="actif">Opérationnel</option>
                                <option value="maintenance">En Maintenance</option>
                                <option value="hors_service">Retiré du Service</option>
                            </select>
                        </div>
                        <Input label="Date d'Acquisition" type="date" value={addForm.date_acquisition} onChange={(e: any) => setAddForm({ ...addForm, date_acquisition: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)}>Annuler</Button>
                        <Button variant="primary" type="submit">Valider</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={!!editVehicle} onClose={() => setEditVehicle(null)} title={`Modification: ${editVehicle?.immatriculation}`}>
                <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Input label="Matricule" value={editForm.immatriculation || ''} onChange={(e: any) => setEditForm({ ...editForm, immatriculation: e.target.value })} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>État de Disponibilité</label>
                            <select value={editForm.statut || ''} onChange={e => setEditForm({ ...editForm, statut: e.target.value })} style={{ height: '42px' }}>
                                <option value="actif">Actif / Disponible</option>
                                <option value="maintenance">En Révision</option>
                                <option value="hors_service">Inactif / HS</option>
                            </select>
                        </div>
                        <Input label="Capacité Nominale" type="number" value={editForm.capacite || ''} onChange={(e: any) => setEditForm({ ...editForm, capacite: +e.target.value })} />
                        <Input label="Index Kilométrique" type="number" value={editForm.kilometrage || ''} onChange={(e: any) => setEditForm({ ...editForm, kilometrage: +e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <Button variant="ghost" type="button" onClick={() => setEditVehicle(null)}>Fermer</Button>
                        <Button variant="primary" type="submit">Mettre à Jour</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={!!viewVehicle} onClose={() => setViewVehicle(null)} title="Intelligence Flotte Châssis" width="640px">
                {viewVehicle?.loading ? (
                    <div style={{ textAlign: 'center', padding: '60px' }}>
                         <div className="spinner" style={{ margin: '0 auto' }}></div>
                         <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Collecte des télémétries...</p>
                    </div>
                ) : viewVehicle && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            {[
                                { label: 'Trajets Eff', val: viewVehicle.stats?.trajets_total || 0, color: 'var(--primary)', icon: <Layers size={14}/> },
                                { label: 'Revenue Net', val: `${((viewVehicle.stats?.recette_totale || 0) / 1000).toFixed(0)}k`, color: 'var(--success)', icon: <Activity size={14}/> },
                                { label: 'Saturation', val: `${Math.round(viewVehicle.stats?.moy_passagers || 0)} passagers`, color: 'var(--info)', icon: <Users size={14}/> },
                            ].map((s, idx) => (
                                <Card key={idx} padding="md" style={{ textAlign: 'center', background: 'var(--bg-subtle)', border: 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: s.color, marginBottom: '6px' }}>
                                        {s.icon}
                                    </div>
                                    <p style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1 }}>{s.val}</p>
                                    <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '6px' }}>{s.label}</p>
                                </Card>
                            ))}
                        </div>
                        
                        <div>
                            <h4 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '4px', height: '12px', background: 'var(--primary)', borderRadius: '2px' }} />
                                Spécifications Techniques
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {[
                                    ['Immatriculation', viewVehicle.vehicule?.immatriculation],
                                    ['Modèle / Gamme', viewVehicle.vehicule?.type],
                                    ['Mise en Service', viewVehicle.vehicule?.date_acquisition ? new Date(viewVehicle.vehicule.date_acquisition).toLocaleDateString() : 'Inconnue'],
                                    ['Kilométrage Total', `${viewVehicle.vehicule?.kilometrage?.toLocaleString('fr-FR')} km`],
                                ].map(([l, v]) => (
                                    <div key={l} style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>{l}</p>
                                        <p style={{ fontWeight: 800, marginTop: '4px', textTransform: 'capitalize', color: 'var(--text-main)' }}>{v || '—'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {viewVehicle.maintenances?.length > 0 && (
                            <div>
                                <h4 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '4px', height: '12px', background: 'var(--warning)', borderRadius: '2px' }} />
                                    Journal Technique Récent
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {viewVehicle.maintenances.slice(0, 3).map((m: any) => (
                                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'var(--bg-subtle)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: m.effectuee ? 'var(--success-light)' : 'var(--warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.effectuee ? 'var(--success)' : 'var(--warning)' }}>
                                                    {m.effectuee ? <CheckCircle size={16}/> : <Clock size={16}/>}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>{m.type}</p>
                                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(m.date_prevue).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text-main)' }}>{(m.cout / 1000).toFixed(0)}k <span style={{ fontSize: '10px', opacity: 0.5 }}>CFA</span></span>
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
