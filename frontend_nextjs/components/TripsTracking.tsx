import React, { useEffect, useState } from 'react';
import { 
    Navigation, Clock, CheckCircle, XCircle, ChevronLeft, 
    ChevronRight, Filter, Plus, FileSpreadsheet, Calendar, User, Truck
} from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { exportToExcel } from '../lib/excelUtils';
import Modal from './Modal';
import { Card, Button, Input, Badge, Skeleton, DataTable } from './ui';
import { useToast } from './ui/Toast';

const STATUT_COLORS: Record<string, any> = {
    termine: 'success', 
    en_cours: 'info', 
    planifie: 'warning', 
    annule: 'danger'
};

export default function TripsTracking({ search, setSearch }: any) {
    const [trips, setTrips] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [filterStatut, setFilterStatut] = useState('ouverts');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [lines, setLines] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const toast = useToast();

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
            let statutParam = '';
            if (filterStatut === 'ouverts') {
                statutParam = '&statut=en_cours&statut=planifie'; // Trajets ouverts
            } else if (filterStatut !== 'all') {
                statutParam = `&statut=${filterStatut}`;
            }
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
            toast.error("Erreur", "Impossible de charger les trajets.");
        } finally {
            setLoading(false);
        }
    }

    async function loadOptions() {
        try {
            const [lRes, dRes, vRes] = await Promise.all([
                fetchWithAuth('/lignes'),
                fetchWithAuth('/chauffeurs?disponibilite=true'),
                fetchWithAuth('/vehicules?statut=actif')
            ]);
            if (lRes.ok) setLines(await lRes.json());
            if (dRes.ok) setDrivers(await dRes.json());
            if (vRes.ok) setVehicles(await vRes.json());
        } catch (e) {
            toast.error("Erreur", "Échec du chargement des options.");
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (formData.ligne_id === 0 || formData.chauffeur_id === 0 || formData.vehicule_id === 0) {
            toast.warning("Champs requis", "Veuillez sélectionner tous les éléments.");
            return;
        }
        const res = await fetchWithAuth('/trajets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (res.ok) {
            toast.success("Succès", "Trajet programmé avec succès.");
            setIsModalOpen(false);
            loadData();
        } else {
            toast.error("Erreur", "Échec de la programmation.");
        }
    }

    function openAdd() {
        loadOptions();
        setIsModalOpen(true);
    }

    function formatDate(iso: string) {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    const columns = [
        { 
            key: 'id', 
            label: 'ID', 
            render: (v: any) => <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{String(v).padStart(4, '0')}</span> 
        },
        { 
            key: 'date_heure_depart', 
            label: 'Départ', 
            render: (v: any) => (
                <div>
                    <p style={{ fontWeight: 600 }}>{new Date(v).toLocaleDateString()}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(v).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
            )
        },
        { 
            key: 'ligne_code', 
            label: 'Itinéraire', 
            render: (v: any, row: any) => (
                <div style={{ minWidth: '150px' }}>
                    <Badge variant="info" size="sm" style={{ marginBottom: '4px' }}>{v}</Badge>
                    <p style={{ fontWeight: 700, fontSize: '13px' }}>{row.origine}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>→ {row.destination}</p>
                </div>
            )
        },
        { 
            key: 'chauffeur', 
            label: 'Personnel',
            render: (v: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={12} color="var(--primary)" />
                    </div>
                    <span>{v || 'Non assigné'}</span>
                </div>
            )
        },
        { 
            key: 'vehicule', 
            label: 'Véhicule',
            render: (v: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Truck size={14} color="var(--text-muted)" />
                    <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
            )
        },
        { 
            key: 'nb_passagers', 
            label: 'Passagers',
            render: (v: any) => <Badge variant="ghost">{v || 0}</Badge>
        },
        { 
            key: 'recette', 
            label: 'Recette',
            render: (v: any) => <span style={{ fontWeight: 800, color: 'var(--success)' }}>{v > 0 ? `${(v/1000).toFixed(0)}k` : '—'}</span>
        },
        { 
            key: 'statut', 
            label: 'État', 
            render: (v: any) => <Badge variant={STATUT_COLORS[v] || 'ghost'}>{v.replace('_', ' ')}</Badge> 
        }
    ];

    return (
        <div className="animate-up">
            {/* KPI ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <TripKPI label="Total Trajets" value={summary?.total || 0} icon={<Navigation />} color="var(--primary)" />
                <TripKPI label="En cours" value={summary?.en_cours || 0} icon={<Clock />} color="var(--info)" />
                <TripKPI label="Terminés" value={summary?.termine || 0} icon={<CheckCircle />} color="var(--success)" />
                <TripKPI label="Annulés" value={summary?.annule || 0} icon={<XCircle />} color="var(--danger)" />
            </div>

            <Card padding="none">
                <DataTable 
                    title="Suivi de l'Activité"
                    subtitle={`${total} trajets enregistrés`}
                    columns={columns}
                    data={trips.filter(t => 
                        (t.chauffeur?.toLowerCase() || '').includes(search.toLowerCase()) || 
                        (t.ligne_code?.toLowerCase() || '').includes(search.toLowerCase())
                    )}
                    loading={loading}
                    onSearch={setSearch}
                    searchPlaceholder="Ligne, chauffeur..."
                    actions={
                        <div style={{ display: 'flex', gap: '8px' }}>
                             <select 
                                value={filterStatut} 
                                onChange={e => { setFilterStatut(e.target.value); setPage(1); }} 
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}
                            >
                                <option value="all">Tous les statuts</option>
                                <option value="ouverts">Dossiers Ouverts</option>
                                <option value="termine">Terminés</option>
                                <option value="en_cours">En cours</option>
                                <option value="planifie">Planifiés</option>
                                <option value="annule">Annulés</option>
                            </select>
                            <Button variant="outline" size="md" onClick={() => exportToExcel(trips, 'Historique_Trajets')}>
                                <FileSpreadsheet size={18} />
                            </Button>
                            <Button variant="primary" size="md" onClick={openAdd}>
                                <Plus size={18} /> Nouveau
                            </Button>
                        </div>
                    }
                />
                
                {pages > 1 && (
                    <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
                         <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                <ChevronLeft size={16} /> Précédent
                            </Button>
                            <span style={{ fontSize: '13px', fontWeight: 600, padding: '0 16px' }}>Page {page} sur {pages}</span>
                            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>
                                Suivant <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Programmer un nouveau trajet">
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Itinéraire</label>
                        <select 
                            value={formData.ligne_id} 
                            onChange={e => setFormData({ ...formData, ligne_id: +e.target.value })}
                            style={{ height: '42px' }}
                        >
                            <option value={0}>Sélectionner une ligne du réseau</option>
                            {lines.map((l: any) => (
                                <option key={l.id} value={l.id}>{l.code} | {l.origine} — {l.destination}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Chauffeur</label>
                            <select value={formData.chauffeur_id} onChange={e => setFormData({ ...formData, chauffeur_id: +e.target.value })} style={{ height: '42px' }}>
                                <option value={0}>Assigner un chauffeur</option>
                                {drivers.map((d: any) => (
                                    <option key={d.id} value={d.id}>{d.prenom} {d.nom}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Matériel Roulant</label>
                            <select value={formData.vehicule_id} onChange={e => setFormData({ ...formData, vehicule_id: +e.target.value })} style={{ height: '42px' }}>
                                <option value={0}>Assigner un véhicule</option>
                                {vehicles.map((v: any) => (
                                    <option key={v.id} value={v.id}>{v.immatriculation} ({v.type})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Départ Prévu</label>
                        <Input type="datetime-local" required value={formData.date_heure_depart} onChange={(e:any) => setFormData({ ...formData, date_heure_depart: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                        <Button variant="primary" type="submit">Valider la programmation</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function TripKPI({ label, value, icon, color }: any) {
    return (
        <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: `4px solid ${color}` }}>
            <div style={{ 
                width: '48px', height: '48px', borderRadius: '14px', 
                background: `${color}10`, color, 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)'
            }}>
                {React.cloneElement(icon, { size: 24 })}
            </div>
            <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</p>
                <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1, marginTop: '4px' }}>{value}</p>
            </div>
        </Card>
    );
}
