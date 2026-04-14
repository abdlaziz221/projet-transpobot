import React, { useEffect, useState } from 'react';
import { 
  Users, Search, Mail, Phone, Calendar, CreditCard,
  Target, AlertTriangle, Coins, UserCheck, Plus, Trash2,
  FileSpreadsheet, Edit3, ChevronRight, User, MoreVertical, ShieldCheck
} from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { exportToExcel } from '../lib/excelUtils';
import Modal from './Modal';
import { Card, Button, Input, Badge, Skeleton } from './ui';
import { useToast } from './ui/Toast';

export default function DriversManagement({ search, setSearch }: any) {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const toast = useToast();

  const [formData, setFormData] = useState({
    nom: '', prenom: '', telephone: '', numero_permis: '',
    categorie_permis: 'D', disponibilite: true
  });

  useEffect(() => { loadDrivers(); }, []);

  async function loadDrivers() {
    setLoading(true);
    try {
        const res = await fetchWithAuth('/chauffeurs_custom');
        if (res.ok) setDrivers(await res.json());
    } catch (e) {
        toast.error("Erreur", "Impossible de charger les chauffeurs.");
    } finally {
        setLoading(false);
    }
  }

  async function selectDriver(id: number) {
    setDetailLoading(true);
    try {
        const res = await fetchWithAuth(`/chauffeurs_custom/${id}`);
        if (res.ok) setSelectedDriver(await res.json());
    } catch (e) {
        toast.error("Erreur", "Détails indisponibles.");
    } finally {
        setDetailLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetchWithAuth('/chauffeurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, date_embauche: new Date().toISOString().split('T')[0] })
    });
    if (res.ok) {
        toast.success("Succès", "Nouveau chauffeur recruté !");
        setIsModalOpen(false);
        loadDrivers();
        setFormData({ nom: '', prenom: '', telephone: '', numero_permis: '', categorie_permis: 'D', disponibilite: true });
    } else toast.error("Erreur", "L'ajout a échoué.");
  }

  async function handleDelete(id: number) {
    if (!confirm("Voulez-vous révoquer ce chauffeur ?")) return;
    const res = await fetchWithAuth(`/chauffeurs/${id}`, { method: 'DELETE' });
    if (res.ok) {
        toast.success("Supprimé", "Chauffeur retiré du registre.");
        setSelectedDriver(null);
        loadDrivers();
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetchWithAuth(`/chauffeurs_custom/${selectedDriver.chauffeur.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    });
    if (res.ok) {
        toast.success("Mis à jour", "Profil chauffeur actualisé.");
        setIsEditOpen(false);
        loadDrivers();
        selectDriver(selectedDriver.chauffeur.id);
    } else toast.error("Erreur", "La mise à jour a échoué.");
  }

  function openEdit() {
    setFormData({
        nom: selectedDriver.chauffeur.nom,
        prenom: selectedDriver.chauffeur.prenom,
        telephone: selectedDriver.chauffeur.telephone,
        numero_permis: selectedDriver.chauffeur.numero_permis,
        categorie_permis: selectedDriver.chauffeur.categorie_permis,
        disponibilite: selectedDriver.chauffeur.disponibilite
    });
    setIsEditOpen(true);
  }

  const filtered = drivers.filter(d => 
    `${d.prenom} ${d.nom}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-up split-view" style={{ gridTemplateColumns: 'minmax(350px, 1fr) 450px', gap: '24px' }}>
      {/* LEFT COLUMN: LIST */}
      <Card padding="none" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-card)' }}>
             <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input 
                    type="text" 
                    placeholder="Chercher un matricule ou nom..." 
                    value={search}
                    onChange={(e: any) => setSearch(e.target.value)}
                    style={{ width: '100%', paddingLeft: '40px', paddingRight: '12px', height: '42px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '14px', background: 'var(--bg-body)' }}
                />
            </div>
            <Button variant="outline" size="md" onClick={() => exportToExcel(filtered, 'Liste_Chauffeurs')}>
                <FileSpreadsheet size={18} />
            </Button>
            <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
                <Plus size={18} />
            </Button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
             <div style={{ padding: '20px' }}>
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} height="70px" style={{ marginBottom: '12px', borderRadius: '12px' }} />)}
             </div>
          ) : filtered.length === 0 ? (
             <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Users size={48} style={{ opacity: 0.1, marginBottom: '16px', margin: '0 auto' }} />
                <p style={{ fontWeight: 600 }}>Aucune correspondance</p>
                <p style={{ fontSize: '13px' }}>Modifiez votre recherche</p>
             </div>
          ) : (
            <div style={{ padding: '12px' }}>
                {filtered.map(d => (
                    <div 
                        key={d.id} 
                        onClick={() => selectDriver(d.id)}
                        style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                            padding: '14px 16px', cursor: 'pointer', borderRadius: '12px',
                            background: selectedDriver?.chauffeur?.id === d.id ? 'var(--primary-light)' : 'transparent',
                            border: selectedDriver?.chauffeur?.id === d.id ? '1px solid var(--primary-200)' : '1px solid transparent',
                            marginBottom: '6px',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        className="driver-card-hover"
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ 
                                width: '44px', height: '44px', borderRadius: '12px', 
                                background: selectedDriver?.chauffeur?.id === d.id ? 'var(--primary)' : 'var(--bg-subtle)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                color: selectedDriver?.chauffeur?.id === d.id ? 'white' : 'var(--primary)', 
                                fontWeight: 800, fontSize: '14px'
                            }}>
                                {d.prenom[0]}{d.nom[0]}
                            </div>
                            <div>
                                <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>{d.prenom} {d.nom}</p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Phone size={10} /> {d.telephone}
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Badge variant={d.disponibilite ? 'success' : 'warning'} size="sm">
                                {d.disponibilite ? 'Libre' : 'En route'}
                            </Badge>
                            <ChevronRight size={16} color="var(--text-muted)" />
                        </div>
                    </div>
                ))}
            </div>
          )}
        </div>
      </Card>

      {/* RIGHT COLUMN: DETAIL */}
      <div style={{ position: 'sticky', top: '24px', height: 'fit-content' }}>
        {detailLoading ? (
            <Card padding="lg">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <Skeleton variant="circle" height="100px" width="100px" />
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Skeleton height="24px" width="60%" />
                        <Skeleton height="16px" width="30%" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', marginTop: '20px' }}>
                        {[1,2,3,4].map(i => <Skeleton key={i} height="90px" style={{ borderRadius: '16px' }} />)}
                    </div>
                </div>
            </Card>
        ) : selectedDriver ? (
          <Card padding="none" style={{ overflow: 'hidden' }}>
            <div style={{ 
                height: '100px', background: 'var(--gradient-primary)', position: 'relative'
             }} />
            <div style={{ padding: '0 30px 30px', marginTop: '-50px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                    <div style={{ 
                        width: '100px', height: '100px', borderRadius: '28px', 
                        background: 'var(--bg-card)', padding: '6px', boxShadow: 'var(--shadow-lg)'
                    }}>
                        <div style={{ 
                            width: '100%', height: '100%', borderRadius: '22px', 
                            background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '32px', fontWeight: 900, color: 'var(--primary)'
                        }}>
                             {selectedDriver.chauffeur.prenom[0]}{selectedDriver.chauffeur.nom[0]}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        <Button variant="outline" size="sm" onClick={openEdit}>
                            <Edit3 size={16} />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(selectedDriver.chauffeur.id)} style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                            <Trash2 size={16} />
                        </Button>
                    </div>
                </div>

                <div style={{ marginBottom: '30px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                        {selectedDriver.chauffeur.prenom} {selectedDriver.chauffeur.nom}
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldCheck size={14} color="var(--success)" /> Matricule Certifié — {selectedDriver.chauffeur.numero_permis}
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <Section title="Informations Professionnelles">
                        <InfoRow icon={<Phone size={14}/>} label="Contact Direct" value={selectedDriver.chauffeur.telephone} />
                        <InfoRow icon={<CreditCard size={14}/>} label="Permis de Conduire" value={selectedDriver.chauffeur.numero_permis} />
                        <InfoRow icon={<Calendar size={14}/>} label="Accréditation" value={`Classe ${selectedDriver.chauffeur.categorie_permis}`} />
                        <InfoRow icon={<UserCheck size={14}/>} label="Statut Réseau" value={selectedDriver.chauffeur.disponibilite ? 'Opérationnel' : 'En Mission'} />
                    </Section>

                    <Section title="Tableau de Bord Performance">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <StatBox label="Trajets" value={selectedDriver.stats.trips} icon={<Target size={18} />} color="var(--primary)" />
                            <StatBox label="Incidents" value={selectedDriver.stats.incidents} icon={<AlertTriangle size={18} />} color="var(--danger)" />
                            <StatBox label="Recettes" value={`${(selectedDriver.stats.revenue / 1000).toFixed(0)}k`} icon={<Coins size={18} />} color="var(--success)" />
                            <StatBox label="Passagers" value={selectedDriver.stats.passengers} icon={<Users size={18} />} color="var(--info)" />
                        </div>
                    </Section>
                </div>
            </div>
          </Card>
        ) : (
          <Card padding="lg" style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', border: '2px dashed var(--border)' }}>
             <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', opacity: 0.5 }}>
                <Users size={32} color="var(--primary)" />
             </div>
             <p style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-main)' }}>Sélectionnez un profil</p>
             <p style={{ fontSize: '14px', marginTop: '6px', color: 'var(--text-muted)', maxWidth: '240px' }}>Consultez les KPIs détaillés et gérez les informations du chauffeur.</p>
          </Card>
        )}
      </div>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Actualiser le Profil Chauffeur">
         <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Input label="Prénom" required value={formData.prenom} onChange={(e: any) => setFormData({...formData, prenom: e.target.value})} />
                <Input label="Nom" required value={formData.nom} onChange={(e: any) => setFormData({...formData, nom: e.target.value})} />
            </div>
            <Input label="Téléphone" required value={formData.telephone} onChange={(e: any) => setFormData({...formData, telephone: e.target.value})} />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <Input label="Matricule / N° Permis" required value={formData.numero_permis} onChange={(e: any) => setFormData({...formData, numero_permis: e.target.value})} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type Permis</label>
                    <select 
                        value={formData.categorie_permis} 
                        onChange={e => setFormData({...formData, categorie_permis: e.target.value})}
                        style={{ height: '42px' }}
                    >
                        <option value="B">Classe B</option>
                        <option value="C">Classe C</option>
                        <option value="D">Classe D</option>
                    </select>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Annuler</Button>
                <Button variant="primary" type="submit">Valider</Button>
            </div>
         </form>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Recruter un Nouveau Chauffeur">
         <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Input label="Prénom" placeholder="ex: Mamadou" required value={formData.prenom} onChange={(e: any) => setFormData({...formData, prenom: e.target.value})} />
                <Input label="Nom" placeholder="ex: Diop" required value={formData.nom} onChange={(e: any) => setFormData({...formData, nom: e.target.value})} />
            </div>
            <Input label="Téléphone Mobile" placeholder="+221..." required value={formData.telephone} onChange={(e: any) => setFormData({...formData, telephone: e.target.value})} />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <Input label="N° Permis de Conduire" placeholder="SN-XXXX" required value={formData.numero_permis} onChange={(e: any) => setFormData({...formData, numero_permis: e.target.value})} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Catégorie</label>
                    <select 
                        value={formData.categorie_permis} 
                        onChange={e => setFormData({...formData, categorie_permis: e.target.value})}
                        style={{ height: '42px' }}
                    >
                        <option value="B">B (Voiture)</option>
                        <option value="C">C (Poids Lourd)</option>
                        <option value="D">D (Transport)</option>
                    </select>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                <Button variant="primary" type="submit">Confirmer l'Embauche</Button>
            </div>
         </form>
      </Modal>
    </div>
  );
}

function Section({ title, children }: any) {
    return (
        <div>
            <h3 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '4px', height: '14px', background: 'var(--primary)', borderRadius: '2px' }} />
                {title}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{children}</div>
        </div>
    )
}

function InfoRow({ icon, label, value }: any) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', padding: '12px 16px', background: 'var(--bg-subtle)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
                <div style={{ color: 'var(--primary)', opacity: 0.8 }}>{icon}</div> 
                {label}
            </span>
            <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{value}</span>
        </div>
    )
}

function StatBox({ label, value, icon, color }: any) {
    return (
        <Card style={{ padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ color: color, background: `${color}15`, width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {React.cloneElement(icon, { size: 18 })}
            </div>
            <div>
                <p style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginTop: '4px', letterSpacing: '0.05em' }}>{label}</p>
            </div>
        </Card>
    )
}
