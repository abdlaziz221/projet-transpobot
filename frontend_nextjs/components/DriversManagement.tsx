/* eslint-disable */

'use client';
import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  Calendar, 
  CreditCard,
  Target,
  AlertTriangle,
  Coins,
  UserCheck,
  Plus,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { exportToExcel } from '../lib/excelUtils';
import Modal from './Modal';
import toast from 'react-hot-toast';

export default function DriversManagement({ search, setSearch }: any) {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    numero_permis: '',
    categorie_permis: 'D',
    disponibilite: true
  });

  useEffect(() => {
    loadDrivers();
  }, []);

  async function loadDrivers() {
    const res = await fetchWithAuth('/chauffeurs_custom');
    if (res.ok) {
      setDrivers(await res.json());
    }
    setLoading(false);
  }

  async function selectDriver(id: number) {
    setDetailLoading(true);
    const res = await fetchWithAuth(`/chauffeurs_custom/${id}`);
    if (res.ok) {
        setSelectedDriver(await res.json());
    }
    setDetailLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetchWithAuth('/chauffeurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...formData,
            date_embauche: new Date().toISOString().split('T')[0]
        })
    });
    if (res.ok) {
        toast.success("Chauffeur recruté !");
        setIsModalOpen(false);
        loadDrivers();
        setFormData({ nom: '', prenom: '', telephone: '', numero_permis: '', categorie_permis: 'D', disponibilite: true });
    } else {
        toast.error("Erreur technique.");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Supprimer ce chauffeur ?")) return;
    const res = await fetchWithAuth(`/chauffeurs/${id}`, { method: 'DELETE' });
    if (res.ok) {
        toast.success("Chauffeur supprimé.");
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
        toast.success("Informations mises à jour !");
        setIsEditOpen(false);
        loadDrivers();
        selectDriver(selectedDriver.chauffeur.id);
    } else {
        toast.error("Échec de la mise à jour.");
    }
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
    <div className="animate-up split-view">
      {/* LEFT COLUMN: LIST */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Chercher..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 38px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" style={{ padding: '10px' }} onClick={() => exportToExcel(filtered, 'Liste_Chauffeurs_TranspoBot')}>
              <FileSpreadsheet size={18} />
            </button>
            <button className="btn-primary" style={{ padding: '10px' }} onClick={() => setIsModalOpen(true)}>
              <Plus size={18} />
            </button>
          </div>
        </div>
        
        <div style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
          {loading ? (
             <div style={{ padding: '40px', textAlign: 'center' }}>Chargement...</div>
          ) : (
            <table style={{ border: 'none' }}>
              <tbody>
                {filtered.map(d => (
                  <tr 
                    key={d.id} 
                    onClick={() => selectDriver(d.id)}
                    style={{ 
                        cursor: 'pointer', 
                        background: selectedDriver?.chauffeur?.id === d.id ? 'var(--primary-light)' : 'transparent'
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                            width: '40px', height: '40px', borderRadius: '50%', 
                            background: `linear-gradient(135deg, ${d.id % 2 === 0 ? '#6366f1' : '#10b981'}, #3b82f6)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700
                        }}>
                          {d.prenom[0]}{d.nom[0]}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '14px' }}>{d.prenom} {d.nom}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{d. telephone}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                        <span className={`badge badge-${d.disponibilite ? 'success' : 'warning'}`}>
                            {d.disponibilite ? 'Libre' : 'Trajet'}
                        </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: DETAIL */}
      <div className="card" style={{ position: 'sticky', top: '24px' }}>
        {detailLoading ? (
            <div style={{ textAlign: 'center', padding: '100px 0' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
        ) : selectedDriver ? (
          <div>
            <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '24px', marginBottom: '24px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', gap: '10px' }}>
                    <button 
                       onClick={openEdit}
                       style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                    >
                        <Plus size={18} style={{ transform: 'rotate(45deg)' }} /> {/* Using Plus rotated as placeholder for Edit if Edit2 not imported or similar */}
                    </button>
                    <button 
                       onClick={() => handleDelete(selectedDriver.chauffeur.id)}
                       style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
                <div style={{ 
                    width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 16px',
                    background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '28px', fontWeight: 800
                }}>
                    {selectedDriver.chauffeur.prenom[0]}{selectedDriver.chauffeur.nom[0]}
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{selectedDriver.chauffeur.prenom} {selectedDriver.chauffeur.nom}</h2>
                <div style={{ marginTop: '12px' }}>
                   <span className={`badge badge-${selectedDriver.chauffeur.disponibilite ? 'success' : 'warning'}`}>
                     {selectedDriver.chauffeur.disponibilite ? 'Disponible' : 'Occupé'}
                   </span>
                </div>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
                <Section title="Informations Professionnelles">
                    <InfoRow icon={<Phone size={14}/>} label="Téléphone" value={selectedDriver.chauffeur.telephone} />
                    <InfoRow icon={<CreditCard size={14}/>} label="Permis" value={selectedDriver.chauffeur.numero_permis} />
                    <InfoRow icon={<Calendar size={14}/>} label="Cat." value={selectedDriver.chauffeur.categorie_permis} />
                </Section>

                <Section title="Performance Totale">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <StatBox label="Trajets" value={selectedDriver.stats.trips} icon={<Target size={16} color="var(--primary)"/>} />
                        <StatBox label="Incidents" value={selectedDriver.stats.incidents} icon={<AlertTriangle size={16} color="var(--danger)"/>} />
                        <StatBox label="Recettes" value={`${(selectedDriver.stats.revenue / 1000).toFixed(0)}k`} icon={<Coins size={16} color="var(--success)"/>} />
                        <StatBox label="Passagers" value={selectedDriver.stats.passengers} icon={<UserCheck size={16} color="var(--info)"/>} />
                    </div>
                </Section>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
             <Users size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
             <p>Sélectionnez un profil pour voir les détails.</p>
          </div>
        )}
      </div>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Modifier Chauffeur">
         <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <input placeholder="Prénom" required value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
                <input placeholder="Nom" required value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} />
            </div>
            <input placeholder="Téléphone" required value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <input placeholder="Numéro Permis" required value={formData.numero_permis} onChange={e => setFormData({...formData, numero_permis: e.target.value})} />
                <select value={formData.categorie_permis} onChange={e => setFormData({...formData, categorie_permis: e.target.value})}>
                    <option value="B">B (Voiture)</option>
                    <option value="C">C (Poids Lourd)</option>
                    <option value="D">D (Transport)</option>
                </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsEditOpen(false)}>Annuler</button>
                <button type="submit" className="btn-primary">Sauvegarder</button>
            </div>
         </form>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Recrutement Chauffeur">
         <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <input placeholder="Prénom" required value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
                <input placeholder="Nom" required value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} />
            </div>
            <input placeholder="Téléphone (+221...)" required value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <input placeholder="Numéro Permis" required value={formData.numero_permis} onChange={e => setFormData({...formData, numero_permis: e.target.value})} />
                <select value={formData.categorie_permis} onChange={e => setFormData({...formData, categorie_permis: e.target.value})}>
                    <option value="B">B (Voiture)</option>
                    <option value="C">C (Poids Lourd)</option>
                    <option value="D">D (Transport)</option>
                </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn-primary">Embaucher</button>
            </div>
         </form>
      </Modal>
    </div>
  );
}

function Section({ title, children }: any) {
    return (
        <div>
            <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '12px' }}>{title}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{children}</div>
        </div>
    )
}

function InfoRow({ icon, label, value }: any) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>{icon} {label}</span>
            <span style={{ fontWeight: 600 }}>{value}</span>
        </div>
    )
}

function StatBox({ label, value, icon }: any) {
    return (
        <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>{icon}</div>
            <p style={{ fontSize: '16px', fontWeight: 700 }}>{value}</p>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</p>
        </div>
    )
}
