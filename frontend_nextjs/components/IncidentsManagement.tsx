import React, { useEffect, useState } from 'react';
import {
    AlertTriangle, ShieldAlert, CheckCircle2, Clock,
    Plus, Check, Filter, Trash2, User, Activity, MoreHorizontal, Wrench
} from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import Modal from './Modal';
import { Card, Button, Input, Badge, DataTable } from './ui';
import { useToast } from './ui/Toast';
import dynamic from 'next/dynamic';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false });

ChartJS.register(ArcElement, Tooltip, Legend);

export default function IncidentsManagement({ search, setSearch }: any) {
    const [incidents, setIncidents] = useState<any[]>([]);
    const [ranking, setRanking] = useState<any[]>([]);
    const [incidentsByType, setIncidentsByType] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [severityFilter, setSeverityFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [trajets, setTrajets] = useState<any[]>([]);
    const toast = useToast();
    const [selectedIncidents, setSelectedIncidents] = useState<number[]>([]);

    const [formData, setFormData] = useState({
        trajet_id: 1,
        type: 'Accident',
        description: '',
        gravite: 'moyen',
        resolu: false,
        date_incident: new Date().toISOString()
    });

    useEffect(() => { loadData(); }, [severityFilter]);

    useEffect(() => {
        // Charger les trajets récents pour le select
        fetchWithAuth('/trajets_custom?limit=20&page=1').then(async res => {
            if (res.ok) {
                const data = await res.json();
                const list = data.data || [];
                setTrajets(list);
                if (list.length > 0) setFormData(prev => ({ ...prev, trajet_id: list[0].id }));
            }
        });
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [iRes, rRes, sRes, tRes] = await Promise.all([
                fetchWithAuth(`/incidents_custom${severityFilter !== 'All' ? `?gravite=${severityFilter}` : ''}`),
                fetchWithAuth('/stats/incidents-ranking'),
                fetchWithAuth('/stats'),
                fetchWithAuth('/stats/incidents-by-type'),
            ]);

            if (iRes.ok) {
                const d = await iRes.json();
                setIncidents(d.data || []);
            }
            if (rRes.ok) setRanking(await rRes.json());
            if (sRes.ok) setStats(await sRes.json());
            if (tRes.ok) setIncidentsByType(await tRes.json());
        } catch (err) {
            toast.error("Erreur", "Impossible de charger les données d'incidents.");
        } finally {
            setLoading(false);
            // Vider la sélection après rechargement
            setSelectedIncidents([]);
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetchWithAuth('/incidents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, date_incident: new Date().toISOString() })
        });
        if (res.ok) {
            toast.success('Signalé', 'Rapport d\'incident enregistré.');
            setIsModalOpen(false);
            setFormData({ trajet_id: 1, type: 'Accident', description: '', gravite: 'moyen', resolu: false, date_incident: new Date().toISOString() });
            loadData();
        } else toast.error("Erreur", "Échec de l'envoi du rapport.");
    }

    async function resolveIncident(id: number) {
        const res = await fetchWithAuth(`/incidents_custom/${id}/resolve`, { method: 'PATCH' });
        if (res.ok) {
            toast.success('Résolu', 'Incident marqué comme traité.');
            loadData();
        } else toast.error('Erreur', 'Impossible de modifier le statut.');
    }

    async function sendToMaintenance(incident: any) {
        // Créer une maintenance pour le véhicule impliqué
        const maintenanceData = {
            vehicule_id: incident.vehicule_id || 1, // À ajuster selon les données
            type: 'Réparation suite incident',
            description: `Maintenance suite à ${incident.type}: ${incident.description}`,
            date_prevue: new Date().toISOString().split('T')[0],
            cout: 0,
            effectuee: false
        };
        const res = await fetchWithAuth('/maintenance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(maintenanceData)
        });
        if (res.ok) {
            toast.success('Maintenance créée', 'Le véhicule a été envoyé en maintenance.');
            // Optionnellement marquer l'incident comme résolu
            resolveIncident(incident.id);
        } else toast.error('Erreur', 'Impossible de créer la maintenance.');
    }

    function toggleIncidentSelection(id: number) {
        setSelectedIncidents(prev => 
            prev.includes(id) 
                ? prev.filter(i => i !== id) 
                : [...prev, id]
        );
    }

    function selectAllIncidents() {
        const unresolvedIncidents = incidents.filter(i => !i.resolu).map(i => i.id);
        setSelectedIncidents(unresolvedIncidents);
    }

    function deselectAllIncidents() {
        setSelectedIncidents([]);
    }

    async function resolveSelectedIncidents() {
        if (selectedIncidents.length === 0) {
            toast.warning('Aucune sélection', 'Veuillez sélectionner au moins un incident.');
            return;
        }

        const promises = selectedIncidents.map(id => 
            fetchWithAuth(`/incidents_custom/${id}/resolve`, { method: 'PATCH' })
        );

        try {
            const results = await Promise.all(promises);
            const successCount = results.filter(r => r.ok).length;
            
            if (successCount === selectedIncidents.length) {
                toast.success('Résolus', `${successCount} incident(s) marqué(s) comme traité(s).`);
            } else {
                toast.warning('Partiellement réussi', `${successCount}/${selectedIncidents.length} incident(s) résolu(s).`);
            }
            
            setSelectedIncidents([]);
            loadData();
        } catch (err) {
            toast.error('Erreur', 'Impossible de modifier les statuts.');
        }
    }

    async function handleDelete(id: number) {
        if (!confirm("Supprimer ce rapport d'incident ?")) return;
        const res = await fetchWithAuth(`/incidents/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success("Supprimé", "Rapport retiré de l'historique.");
            loadData();
        } else toast.error("Erreur", "Échec de la suppression.");
    }

    const typeColors: Record<string, string> = {
        Accident: '#ef4444', 
        Panne: '#f59e0b', 
        Retard: '#0ea5e9', 
        Comportement: '#7c3aed'
    };

    const doughnutData = {
        labels: incidentsByType.map((t: any) => t.type),
        datasets: [{
            data: incidentsByType.map((t: any) => t.nb),
            backgroundColor: incidentsByType.map((t: any) => typeColors[t.type] || '#64748b'),
            borderWidth: 0,
            hoverOffset: 10
        }]
    };

    const columns = [
        {
            key: 'select',
            label: '',
            style: { width: '40px', padding: '0 8px' },
            render: (v: any, row: any) => (
                !row.resolu && (
                    <input
                        type="checkbox"
                        checked={selectedIncidents.includes(row.id)}
                        onChange={() => toggleIncidentSelection(row.id)}
                        style={{ cursor: 'pointer' }}
                    />
                )
            )
        },
        {
            key: 'type',
            label: 'Incident',
            render: (v: any, row: any) => (
                <div style={{ maxWidth: '300px' }}>
                    <p style={{ fontWeight: 700, fontSize: '13px' }}>{v}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{row.description}</p>
                    <Badge variant="ghost" size="sm" style={{ marginTop: '4px' }}>{row.ligne}</Badge>
                </div>
            )
        },
        {
            key: 'chauffeur',
            label: 'Chauffeur',
            render: (v: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={12} color="var(--primary)" />
                    </div>
                    <span style={{ fontSize: '13px' }}>{v}</span>
                </div>
            )
        },
        {
            key: 'gravite',
            label: 'Gravité',
            render: (v: any) => (
                <Badge variant={v === 'grave' ? 'danger' : v === 'moyen' ? 'warning' : 'ghost'}>
                    {v}
                </Badge>
            )
        },
        {
            key: 'date_incident',
            label: 'Date',
            render: (v: any) => <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{v ? new Date(v).toLocaleDateString('fr-FR') : '—'}</span>
        },
        {
            key: 'resolu',
            label: 'État',
            render: (v: any) => (
                <Badge variant={v ? 'success' : 'warning'} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {v ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                    {v ? 'Traité' : 'En attente'}
                </Badge>
            )
        },
        {
            key: 'id',
            label: 'Action',
            style: { textAlign: 'right' as const },
            render: (v: any, row: any) => (
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                    {!row.resolu && (
                        <>
                            <Button variant="ghost" size="sm" onClick={() => resolveIncident(v)} title="Marquer comme résolu">
                                <Check size={16} color="var(--success)" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => sendToMaintenance(row)} title="Envoyer en maintenance">
                                <Wrench size={16} color="var(--warning)" />
                            </Button>
                        </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(v)} style={{ color: 'var(--danger)' }} title="Supprimer">
                        <Trash2 size={16} />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="animate-up">
            {/* KPIs */}
            <div className="tablet-grid desktop-sm-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '24px'
            }}>
                <IncKPI label="Total Incidents" value={incidents.length} icon={<AlertTriangle />} color="var(--text-muted)" />
                <IncKPI label="Niveau Critique" value={stats?.incidents_graves || 0} icon={<ShieldAlert />} color="var(--danger)" />
                <IncKPI label="Dossiers Ouverts" value={stats?.incidents_ouverts || 0} icon={<Clock />} color="var(--warning)" />
                <IncKPI label="Résolus / Archivés" value={incidents.filter(i => i.resolu).length} icon={<CheckCircle2 />} color="var(--success)" />
            </div>

            <div className="split-view" style={{
              display: 'grid',
              gridTemplateColumns: window?.innerWidth < 1024 ? '1fr' : '1fr 320px',
              gap: '24px'
            }}>
                <Card padding="none">
                    <DataTable 
                        title="Journal des Événements"
                        subtitle="Historique des incidents et anomalies réseau"
                        columns={columns}
                        data={incidents
                            .filter(i => 
                                (i.type?.toLowerCase() || '').includes(search.toLowerCase()) || 
                                (i.description?.toLowerCase() || '').includes(search.toLowerCase()) ||
                                (i.chauffeur?.toLowerCase() || '').includes(search.toLowerCase())
                            )
                            .sort((a, b) => {
                                // Les incidents non résolus en premier, puis les résolus
                                if (!a.resolu && b.resolu) return -1;
                                if (a.resolu && !b.resolu) return 1;
                                
                                // Pour les incidents du même statut, trier par date décroissante (plus récent en premier)
                                const dateA = new Date(a.date_incident || 0).getTime();
                                const dateB = new Date(b.date_incident || 0).getTime();
                                return dateB - dateA;
                            })
                        }
                        loading={loading}
                        onSearch={setSearch}
                        searchPlaceholder="Type, chauffeur..."
                        actions={
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {/* Sélection multiple */}
                                {selectedIncidents.length > 0 && (
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            {selectedIncidents.length} sélectionné(s)
                                        </span>
                                        <Button variant="success" size="sm" onClick={resolveSelectedIncidents}>
                                            <Check size={14} /> Résoudre
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={deselectAllIncidents}>
                                            Désélectionner
                                        </Button>
                                    </div>
                                )}
                                
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <Button variant="ghost" size="sm" onClick={selectAllIncidents}>
                                        Tout sélectionner
                                    </Button>
                                    <select
                                        value={severityFilter}
                                        onChange={e => setSeverityFilter(e.target.value)}
                                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}
                                    >
                                        <option value="All">Toutes gravités</option>
                                        <option value="grave">Critique</option>
                                        <option value="moyen">Moyen</option>
                                        <option value="faible">Mineur</option>
                                    </select>
                                    <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
                                        <Plus size={18} /> Rapporter
                                    </Button>
                                </div>
                            </div>
                        }
                    />
                </Card>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <Card>
                         <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={16} color="var(--primary)" />
                            Chauffeurs Sous Surveillance
                        </h3>
                        {ranking.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px 0' }}>
                                <CheckCircle2 size={32} color="var(--success)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Aucun incident majeur ce mois</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {ranking.map((r: any) => (
                                    <div key={r.id}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                                            <span style={{ fontWeight: 700 }}>{r.chauffeur}</span>
                                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{r.total} signalements</span>
                                        </div>
                                        <div className="progress-bar" style={{ height: '6px' }}>
                                            <div className="progress-bar-fill" style={{ width: `${(r.total / (ranking[0]?.total || 1)) * 100}%`, background: r.graves > 0 ? 'var(--danger-gradient)' : 'var(--warning)' }} />
                                        </div>
                                        {r.graves > 0 && <p style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 700, marginTop: '4px' }}>⚠ {r.graves} incident(s) critiques</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <Card>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '20px' }}>Analyse par Typologie</h3>
                        {incidentsByType.length > 0 ? (
                            <div style={{ height: '200px', width: '100%', position: 'relative' }}>
                                <Doughnut 
                                    data={doughnutData} 
                                    options={{ 
                                        maintainAspectRatio: false, 
                                        plugins: { 
                                            legend: { 
                                                position: 'bottom' as const, 
                                                labels: { 
                                                    boxWidth: 8, 
                                                    usePointStyle: true,
                                                    padding: 15,
                                                    font: { size: 11, weight: '600' } as any
                                                } 
                                            } 
                                        }, 
                                        cutout: '75%' 
                                    }} 
                                />
                                <div style={{ position: 'absolute', top: '44%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                                    <p style={{ fontSize: '20px', fontWeight: 800 }}>{incidents.length}</p>
                                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total</p>
                                </div>
                            </div>
                        ) : (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>Données insuffisantes</p>
                        )}
                    </Card>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Rapport d'Incident Industriel">
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trajet Incriminé *</label>
                        <select value={formData.trajet_id} onChange={e => setFormData({ ...formData, trajet_id: +e.target.value })} style={{ height: '42px' }}>
                            {trajets.map((t: any) => (
                                <option key={t.id} value={t.id}>TR#{t.id} — {t.ligne_code} ({t.chauffeur})</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nature de l'incident *</label>
                            <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} style={{ height: '42px' }}>
                                <option value="Accident">Accident</option>
                                <option value="Panne">Panne Technique</option>
                                <option value="Retard">Retard Majeur</option>
                                <option value="Comportement">Comportement Chauffeur</option>
                                <option value="Autre">Autre Anomale</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Degré de Gravité *</label>
                            <select value={formData.gravite} onChange={e => setFormData({ ...formData, gravite: e.target.value })} style={{ height: '42px' }}>
                                <option value="faible">Mineur (Niveau 1)</option>
                                <option value="moyen">Moyen (Niveau 2)</option>
                                <option value="grave">Critique (Niveau 3)</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Observations & Description *</label>
                        <textarea 
                            rows={4} 
                            required 
                            value={formData.description} 
                            onChange={e => setFormData({ ...formData, description: e.target.value })} 
                            placeholder="Détails de l'événement..."
                            style={{ 
                                padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', 
                                fontFamily: 'inherit', fontSize: '14px', resize: 'none'
                             }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                        <Button variant="primary" type="submit">Transmettre le Rapport</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function IncKPI({ label, value, icon, color }: any) {
    return (
        <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
                width: '44px', height: '44px', borderRadius: '12px', 
                background: `${color}15`, color, 
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
                {React.cloneElement(icon, { size: 22 })}
            </div>
            <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</p>
                <p style={{ fontSize: '24px', fontWeight: 800 }}>{value}</p>
            </div>
        </Card>
    );
}
