/* eslint-disable */
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchWithAuth } from '../lib/api';
import { Activity, AlertTriangle, Bus, RefreshCw, MapPin, Navigation, Zap, Layers } from 'lucide-react';

if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

// ─── Coordinates ─────────────────────────────────────────────────────────────
const CITY_COORDS: Record<string, [number, number]> = {
  'Dakar':               [14.6937, -17.4441],
  'Dakar Plateau':       [14.6960, -17.4423],
  'Dakar (Plateau)':     [14.6960, -17.4423],
  'Dakar Centre':        [14.6960, -17.4423],
  'Dakar Port':          [14.6943, -17.4350],
  'Dakar Gare Routière': [14.7197, -17.4602],
  'Dakar (Pikine)':      [14.7460, -17.3990],
  'Thiès':               [14.7910, -16.9304],
  'Mbour':               [14.4167, -16.9667],
  'Saint-Louis':         [16.0277, -16.4896],
  'Touba':               [14.8630, -15.8820],
  'Kaolack':             [14.1490, -16.0726],
  'Ziguinchor':          [12.5583, -16.2719],
  'Tambacounda':         [13.7709, -13.6670],
  'Kolda':               [12.8987, -14.9412],
  'Fatick':              [14.3390, -16.4040],
  'Louga':               [15.6144, -16.2242],
  'Diourbel':            [14.6551, -16.2302],
  'Tivaouane':           [14.9547, -16.8059],
  'Rufisque':            [14.7156, -17.2744],
  'Diamniadio':          [14.7153, -17.2472],
  'Saly Portudal':       [14.4500, -17.0167],
  'Richard Toll':        [16.4614, -15.6974],
  'Cap Skirring':        [12.3870, -16.7333],
  'Kédougou':            [12.5547, -12.1750],
  'Mbacké':              [14.7872, -15.9086],
  'Aéroport AIBD':       [14.7397, -17.4891],
  'Kaffrine':            [14.1056, -15.5500],
};

function resolveCoords(name: string): [number, number] | null {
  if (!name) return null;
  if (CITY_COORDS[name]) return CITY_COORDS[name];
  const lc = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [k, v] of Object.entries(CITY_COORDS)) {
    const kn = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (lc === kn || lc.startsWith(kn) || kn.startsWith(lc)) return v;
  }
  return null;
}

// ─── Module-level OSRM cache (survives re-renders & data refreshes) ───────────
const ROUTE_CACHE: Record<string, [number, number][]> = {};

async function fetchRouteOSRM(from: [number, number], to: [number, number]): Promise<[number, number][]> {
  const key    = `${from[0].toFixed(3)},${from[1].toFixed(3)}→${to[0].toFixed(3)},${to[1].toFixed(3)}`;
  const revKey = `${to[0].toFixed(3)},${to[1].toFixed(3)}→${from[0].toFixed(3)},${from[1].toFixed(3)}`;

  if (ROUTE_CACHE[key]) return ROUTE_CACHE[key];
  // Re-use reverse route flipped (saves one HTTP call)
  if (ROUTE_CACHE[revKey]) {
    const rev = [...ROUTE_CACHE[revKey]].reverse() as [number, number][];
    ROUTE_CACHE[key] = rev;
    return rev;
  }

  try {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 7000);
    // OSRM expects lon,lat (opposite of Leaflet lat,lon)
    const url  = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res  = await fetch(url, { signal: ctrl.signal });
    clearTimeout(tid);
    const json = await res.json();
    if (json.code !== 'Ok' || !json.routes?.[0]) throw new Error('no route');
    const coords: [number, number][] = json.routes[0].geometry.coordinates.map(
      ([lon, lat]: [number, number]) => [lat, lon] as [number, number]
    );
    ROUTE_CACHE[key] = coords;
    return coords;
  } catch {
    const fallback: [number, number][] = [from, to];
    ROUTE_CACHE[key] = fallback;
    return fallback;
  }
}

// ─── Interpolate lat/lon along a polyline path ────────────────────────────────
function interpolateOnPath(path: [number, number][], progress: number): [number, number] {
  if (!path?.length) return [14.6937, -17.4441];
  if (path.length === 1) return path[0];
  if (progress <= 0) return path[0];
  if (progress >= 1) return path[path.length - 1];

  let total = 0;
  const cum: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    const dy = path[i][0] - path[i - 1][0];
    const dx = path[i][1] - path[i - 1][1];
    total += Math.sqrt(dy * dy + dx * dx);
    cum.push(total);
  }
  const target = progress * total;
  for (let i = 1; i < cum.length; i++) {
    if (cum[i] >= target) {
      const t = (target - cum[i - 1]) / (cum[i] - cum[i - 1]);
      return [
        path[i - 1][0] + t * (path[i][0] - path[i - 1][0]),
        path[i - 1][1] + t * (path[i][1] - path[i - 1][1]),
      ];
    }
  }
  return path[path.length - 1];
}

function getProgress(dep: string | null, arr: string | null): number {
  if (!dep || !arr) return 0.5;
  const d = new Date(dep).getTime(), a = new Date(arr).getTime(), n = Date.now();
  if (n <= d) return 0.02;
  if (n >= a) return 0.98;
  return (n - d) / (a - d);
}

// ─── Marker icons ─────────────────────────────────────────────────────────────
function vehicleIcon(type: string, incident: boolean) {
  const emoji = type?.toLowerCase().includes('bus') ? '🚌' :
                type?.toLowerCase().includes('taxi') ? '🚖' : '🚐';
  const color = incident ? '#ef4444' : '#22c55e';
  const glow  = incident ? 'rgba(239,68,68,0.7)' : 'rgba(34,197,94,0.7)';
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 14px ${glow},0 2px 6px rgba(0,0,0,0.6);animation:vPulse 2s ease-in-out infinite">${emoji}</div>`,
    iconSize: [30, 30], iconAnchor: [15, 15],
  });
}

function incidentIcon(gravite: string) {
  const isGrave = gravite === 'grave' || gravite === 'critique';
  const c = isGrave ? '#ef4444' : '#f97316';
  const bg = isGrave ? 'rgba(239,68,68,0.22)' : 'rgba(249,115,22,0.22)';
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${bg};border:2px solid ${c};display:flex;align-items:center;justify-content:center;font-size:13px;animation:incPulse 1.5s ease-in-out infinite">⚠</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineData {
  id: number; code: string; nom: string;
  origine: string; destination: string; distance_km: number;
  recent_trips: number; total_passengers: number;
  has_incident: boolean; incident_gravite: string;
}
interface ActiveTrip {
  id: number; ligne_id: number; ligne_code: string;
  origine: string; destination: string;
  date_heure_depart: string | null; date_heure_arrivee: string | null;
  nb_passagers: number; chauffeur: string; vehicule: string; vehicule_type: string;
}
interface MapData {
  lines: LineData[];
  active_trips: ActiveTrip[];
  scheduled_today: any[];
  stats: { total_lines: number; active_trips: number; scheduled_today: number; lines_with_recent_activity: number; open_incidents: number; };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function MapView() {
  const [data,          setData]          = useState<MapData | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [routePaths,    setRoutePaths]    = useState<Record<number, [number, number][]>>({});
  const [routesLoading, setRoutesLoading] = useState(false);
  const [showInactive,  setShowInactive]  = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [lastUpdated,   setLastUpdated]   = useState<Date | null>(null);
  const [tick,          setTick]          = useState(0);
  const routePathsRef = useRef<Record<number, [number, number][]>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/trajets_custom/map_data');
      if (res.ok) { setData(await res.json()); setLastUpdated(new Date()); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const dt = setInterval(fetchData, 30_000);
    const tt = setInterval(() => setTick(t => t + 1), 8_000);
    return () => { clearInterval(dt); clearInterval(tt); };
  }, [fetchData]);

  // Load OSRM road routes for each line (only missing ones)
  useEffect(() => {
    if (!data?.lines) return;
    const missing = data.lines.filter(l => {
      const o = resolveCoords(l.origine), d = resolveCoords(l.destination);
      return o && d && !routePathsRef.current[l.id];
    });
    if (!missing.length) return;
    setRoutesLoading(true);
    (async () => {
      for (const line of missing) {
        const o = resolveCoords(line.origine)!;
        const d = resolveCoords(line.destination)!;
        routePathsRef.current[line.id] = await fetchRouteOSRM(o, d);
        setRoutePaths({ ...routePathsRef.current });   // incremental update
        await new Promise(r => setTimeout(r, 130));    // gentle rate limiting
      }
      setRoutesLoading(false);
    })();
  }, [data]);

  const stats = data?.stats ?? { total_lines: 0, active_trips: 0, scheduled_today: 0, lines_with_recent_activity: 0, open_incidents: 0 };

  const citiesOnMap = React.useMemo(() => {
    if (!data) return [];
    const s = new Set<string>();
    data.lines.forEach(l => { s.add(l.origine); s.add(l.destination); });
    return Array.from(s).filter(c => resolveCoords(c));
  }, [data]);

  const visibleLines = data?.lines.filter(l => showInactive || l.recent_trips > 0) ?? [];

  return (
    <div style={{
      position: 'relative', width: '100%',
      height: 'calc(100vh - var(--topbar-h) - 80px)',
      minHeight: '520px', borderRadius: '16px', overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.07)',
      fontFamily: 'var(--font-sans)',
    }}>
      <MapContainer center={[14.4, -15.5]} zoom={7}
        style={{ width: '100%', height: '100%', background: '#07090f' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; CARTO" subdomains="abcd" maxZoom={18} />

        {/* ── Road polylines (OSRM routes) ── */}
        {visibleLines.map(line => {
          const o = resolveCoords(line.origine);
          const d = resolveCoords(line.destination);
          if (!o || !d) return null;
          const path      = routePaths[line.id] || [o, d];
          const isActive  = line.recent_trips > 0;
          const isInc     = line.has_incident;
          const weight    = isActive ? Math.min(2 + Math.floor(line.recent_trips / 3), 6) : 1.5;
          const color     = isInc
            ? (line.incident_gravite === 'critique' || line.incident_gravite === 'grave' ? '#ef4444' : '#f97316')
            : isActive ? '#22c55e' : 'rgba(255,255,255,0.15)';
          return (
            <React.Fragment key={line.id}>
              {isActive && (
                <Polyline positions={path}
                  pathOptions={{ color, weight: weight + 6, opacity: 0.07 }} />
              )}
              <Polyline positions={path}
                pathOptions={{
                  color, weight,
                  opacity: isActive ? 0.88 : 0.25,
                  dashArray: !isActive ? '6 9' : undefined,
                  lineCap: 'round', lineJoin: 'round',
                }}>
                <Tooltip sticky className="map-tt">
                  <strong style={{ fontSize: 12 }}>{line.nom}</strong>
                  <div style={{ fontSize: 11, marginTop: 3, opacity: 0.75 }}>
                    {isActive ? `${line.recent_trips} trajet(s) · ${line.total_passengers} passagers (7j)` : 'Aucune activité récente'}
                  </div>
                  {isInc && <div style={{ fontSize: 11, color: '#f97316', marginTop: 2 }}>⚠ Incident — {line.incident_gravite}</div>}
                  <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{line.distance_km} km · {line.code}</div>
                </Tooltip>
              </Polyline>
            </React.Fragment>
          );
        })}

        {/* ── City nodes ── */}
        {citiesOnMap.map(city => {
          const coords    = resolveCoords(city)!;
          const cityLines = data?.lines.filter(l => l.origine === city || l.destination === city) ?? [];
          const isActive  = cityLines.some(l => l.recent_trips > 0);
          const hasInc    = cityLines.some(l => l.has_incident);
          const isDakar   = city.toLowerCase().startsWith('dakar');
          return (
            <CircleMarker key={city} center={coords}
              radius={isDakar ? 9 : isActive ? 6 : 4}
              pathOptions={{
                color:       hasInc ? '#ef4444' : isActive ? '#22c55e' : 'rgba(255,255,255,0.3)',
                fillColor:   hasInc ? '#ef444455' : isActive ? '#22c55e44' : 'rgba(255,255,255,0.06)',
                fillOpacity: 1, weight: isActive || isDakar ? 2 : 1,
              }}>
              <Tooltip direction="top" offset={[0, -8]} className="map-tt">
                <strong style={{ fontSize: 12 }}>{city}</strong>
                {hasInc && <span style={{ color: '#f97316', marginLeft: 5 }}>⚠</span>}
                <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>
                  {cityLines.length} ligne(s)
                  {isActive && ` · ${cityLines.reduce((s, l) => s + l.recent_trips, 0)} trajets (7j)`}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* ── Incident markers (placed 38% along road route) ── */}
        {showIncidents && data?.lines.filter(l => l.has_incident).map(line => {
          const path = routePaths[line.id];
          if (!path || path.length < 2) return null;
          const pos = interpolateOnPath(path, 0.38);
          return (
            <Marker key={`inc-${line.id}`} position={pos} icon={incidentIcon(line.incident_gravite)}>
              <Tooltip direction="top" offset={[0, -14]} className="map-tt">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 15 }}>⚠</span>
                  <strong style={{ fontSize: 12, color: '#f97316' }}>Incident signalé</strong>
                </div>
                <div style={{ fontSize: 12 }}>{line.nom}</div>
                <div style={{ marginTop: 5 }}>
                  <span style={{
                    padding: '2px 7px', borderRadius: 4, fontWeight: 700,
                    textTransform: 'capitalize', fontSize: 11,
                    color:       line.incident_gravite === 'grave' || line.incident_gravite === 'critique' ? '#f87171' : '#fb923c',
                    background:  line.incident_gravite === 'grave' || line.incident_gravite === 'critique' ? 'rgba(239,68,68,0.2)' : 'rgba(249,115,22,0.2)',
                  }}>{line.incident_gravite}</span>
                </div>
              </Tooltip>
            </Marker>
          );
        })}

        {/* ── Active vehicle markers (interpolated on road path) ── */}
        {data?.active_trips.map(t => {
          const path = routePaths[t.ligne_id];
          const o    = resolveCoords(t.origine);
          const d    = resolveCoords(t.destination);
          const basePath = path || (o && d ? [o, d] as [number, number][] : null);
          if (!basePath) return null;
          const progress = getProgress(t.date_heure_depart, t.date_heure_arrivee);
          const pos      = interpolateOnPath(basePath, progress);
          const inc      = data.lines.find(l =>
            (l.origine === t.origine && l.destination === t.destination) ||
            (l.origine === t.destination && l.destination === t.origine)
          )?.has_incident ?? false;
          return (
            <Marker key={t.id} position={pos} icon={vehicleIcon(t.vehicule_type, inc)}>
              <Tooltip direction="top" offset={[0, -15]} className="map-tt">
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                  <span style={{ fontSize: 16 }}>
                    {t.vehicule_type?.toLowerCase().includes('bus') ? '🚌' :
                     t.vehicule_type?.toLowerCase().includes('taxi') ? '🚖' : '🚐'}
                  </span>
                  <strong style={{ fontSize: 13 }}>{t.vehicule}</strong>
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{t.origine} → {t.destination}</div>
                <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>{t.chauffeur} · {t.nb_passagers} pass.</div>
                {/* Progress bar */}
                <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: inc ? '#ef4444' : '#22c55e', borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: inc ? '#f87171' : '#4ade80', minWidth: 28 }}>
                    {Math.round(progress * 100)}%
                  </span>
                </div>
                {inc && <div style={{ fontSize: 11, color: '#f97316', marginTop: 4 }}>⚠ Incident sur cette ligne</div>}
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* ── Stats overlay (top-left) ── */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none' }}>
        {[
          { icon: <Activity size={13}/>,      value: stats.active_trips,                label: 'En cours',          color: '#22c55e' },
          { icon: <Navigation size={13}/>,    value: stats.scheduled_today,             label: 'Planifiés auj.',    color: '#60a5fa' },
          { icon: <Bus size={13}/>,           value: stats.lines_with_recent_activity,  label: 'Lignes actives',    color: '#e07b3a' },
          { icon: <AlertTriangle size={13}/>, value: stats.open_incidents,              label: 'Incidents ouverts', color: '#ef4444' },
          { icon: <MapPin size={13}/>,        value: stats.total_lines,                 label: 'Lignes totales',    color: 'rgba(255,255,255,0.4)' },
        ].map(s => (
          <div key={s.label} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 11px',
            background: 'rgba(7,9,15,0.84)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, backdropFilter: 'blur(14px)', pointerEvents: 'auto',
          }}>
            <span style={{ color: s.color }}>{s.icon}</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: 'white', lineHeight: 1, minWidth: 24 }}>
              {loading ? '—' : s.value}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Legend (bottom-left) ── */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, zIndex: 1000,
        padding: '11px 15px', background: 'rgba(7,9,15,0.84)',
        border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, backdropFilter: 'blur(14px)',
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.28)', marginBottom: 8 }}>Légende</div>
        {[
          { color: '#22c55e',                label: 'Ligne active (7 jours)',    dash: false },
          { color: '#f97316',                label: 'Incident signalé',          dash: false },
          { color: '#ef4444',                label: 'Incident grave/critique',   dash: false },
          { color: 'rgba(255,255,255,0.22)', label: 'Aucune activité',           dash: true  },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <svg width="26" height="4">
              <line x1="0" y1="2" x2="26" y2="2" stroke={l.color} strokeWidth="2.5" strokeDasharray={l.dash ? '4 4' : undefined} />
            </svg>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.52)' }}>{l.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 13 }}>⚠</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.52)' }}>Incident localisé</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 14 }}>🚌</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.52)' }}>Véhicule en transit</span>
        </div>
      </div>

      {/* ── Controls + timestamp (top-right) ── */}
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
        <button onClick={fetchData} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          background: 'rgba(196,88,30,0.14)', border: '1px solid rgba(196,88,30,0.28)',
          borderRadius: 10, cursor: 'pointer', color: '#e07b3a', fontSize: 12, fontWeight: 700,
          backdropFilter: 'blur(14px)', transition: 'all 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(196,88,30,0.28)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(196,88,30,0.14)'}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualiser
        </button>

        <button onClick={() => setShowInactive(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
          background: showInactive ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, cursor: 'pointer',
          color: showInactive ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
          fontSize: 11, fontWeight: 600, backdropFilter: 'blur(14px)', transition: 'all 0.2s',
        }}>
          <Layers size={12} />
          {showInactive ? 'Masquer inactives' : 'Toutes les lignes'}
        </button>

        <button onClick={() => setShowIncidents(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
          background: showIncidents ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${showIncidents ? 'rgba(239,68,68,0.22)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 9, cursor: 'pointer',
          color: showIncidents ? '#f87171' : 'rgba(255,255,255,0.25)',
          fontSize: 11, fontWeight: 600, backdropFilter: 'blur(14px)', transition: 'all 0.2s',
        }}>
          <AlertTriangle size={12} />
          {showIncidents ? 'Masquer incidents' : 'Afficher incidents'}
        </button>

        {routesLoading && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
            background: 'rgba(7,9,15,0.78)', border: '1px solid rgba(196,88,30,0.15)',
            borderRadius: 8, backdropFilter: 'blur(10px)',
          }}>
            <Zap size={11} style={{ color: '#e07b3a', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>Chargement routes…</span>
          </div>
        )}

        {lastUpdated && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
            background: 'rgba(7,9,15,0.78)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, backdropFilter: 'blur(10px)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', display: 'inline-block', background: '#22c55e', animation: 'pulseLive 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', fontWeight: 500 }}>
              MAJ {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* ── Incidents list (bottom-right) ── */}
      {showIncidents && (data?.lines.filter(l => l.has_incident).length ?? 0) > 0 && (
        <div style={{
          position: 'absolute', bottom: 16, right: 16, zIndex: 1000,
          width: 256, maxHeight: 210, overflowY: 'auto',
          background: 'rgba(7,9,15,0.88)', border: '1px solid rgba(239,68,68,0.18)',
          borderRadius: 12, backdropFilter: 'blur(14px)', padding: '10px 13px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#f87171', marginBottom: 8 }}>
            <AlertTriangle size={11} /> Incidents actifs ({data?.lines.filter(l => l.has_incident).length})
          </div>
          {data?.lines.filter(l => l.has_incident).map(l => (
            <div key={l.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>{l.nom}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'capitalize',
                  color: l.incident_gravite === 'critique' || l.incident_gravite === 'grave' ? '#f87171' : '#fb923c',
                  background: l.incident_gravite === 'critique' || l.incident_gravite === 'grave' ? 'rgba(239,68,68,0.14)' : 'rgba(249,115,22,0.14)',
                  padding: '1px 6px', borderRadius: 4,
                }}>{l.incident_gravite}</span>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>
                {l.recent_trips} trajet(s) · {l.distance_km} km
              </div>
            </div>
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-container { background: #07090f !important; }
        .leaflet-tile { filter: brightness(0.88) saturate(0.8); }
        .map-tt {
          background: rgba(7,9,15,0.94) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 9px !important; color: white !important;
          font-family: var(--font-sans), system-ui, sans-serif !important;
          padding: 9px 13px !important;
          box-shadow: 0 8px 28px rgba(0,0,0,0.55) !important;
          backdrop-filter: blur(14px); max-width: 240px;
        }
        .map-tt::before { display:none !important; }
        .leaflet-control-zoom {
          border: 1px solid rgba(255,255,255,0.08) !important;
          background: rgba(7,9,15,0.85) !important;
          backdrop-filter: blur(14px); border-radius: 10px !important; overflow: hidden;
        }
        .leaflet-control-zoom a {
          background: transparent !important; color: rgba(255,255,255,0.5) !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
        }
        .leaflet-control-zoom a:hover { background: rgba(255,255,255,0.07) !important; color: white !important; }
        .leaflet-control-attribution { display:none !important; }
        @keyframes vPulse {
          0%,100%{ box-shadow:0 0 10px rgba(34,197,94,0.6),0 2px 6px rgba(0,0,0,0.5); transform:scale(1); }
          50%    { box-shadow:0 0 20px rgba(34,197,94,0.9),0 3px 8px rgba(0,0,0,0.6); transform:scale(1.1); }
        }
        @keyframes incPulse {
          0%,100%{ box-shadow:0 0 6px rgba(249,115,22,0.5); transform:scale(1); }
          50%    { box-shadow:0 0 18px rgba(249,115,22,0.9); transform:scale(1.2); }
        }
        @keyframes pulseLive {
          0%,100%{ box-shadow:0 0 4px rgba(34,197,94,0.7); }
          50%    { box-shadow:0 0 10px rgba(34,197,94,1); }
        }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}} />
    </div>
  );
}
