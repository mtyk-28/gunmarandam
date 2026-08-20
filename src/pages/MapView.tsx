import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline } from 'react-leaflet';
import L, { type LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { loadState, updateCurrentSpot } from '../utils/storage';
import { SPOTS } from '../data/spots';
import { CATEGORY_LABELS } from '../types';
import type { Category } from '../types';
import { useNavigate } from 'react-router-dom';
import styles from './MapView.module.css';

const GUNMA_BOUNDS: LatLngBoundsExpression = [[35.85, 138.20], [37.15, 139.90]];

// Gunma prefecture boundary — actual OSM data converted to Leaflet [lat, lng]
const GUNMA_BOUNDARY: [number, number][] = [
  [36.597728, 138.428667],
  [36.434211, 138.401228],
  [36.404751, 138.459646],
  [36.409282, 138.647831],
  [36.303115, 138.653527],
  [36.2784,   138.600332],
  [36.172067, 138.636339],
  [36.168074, 138.577271],
  [36.120197, 138.645374],
  [36.027054, 138.631962],
  [35.985333, 138.712547],
  [36.034526, 138.754408],
  [36.037303, 138.828391],
  [36.124399, 138.958478],
  [36.127940, 139.041829],
  [36.283398, 139.129659],
  [36.244434, 139.244062],
  [36.235839, 139.320899],
  [36.253339, 139.359765],
  [36.189204, 139.464262],
  [36.210375, 139.587398],
  [36.186572, 139.624883],
  [36.213247, 139.669944],
  [36.271166, 139.632485],
  [36.272104, 139.462710],
  [36.368804, 139.367364],
  [36.465976, 139.436468],
  [36.550686, 139.439039],
  [36.581883, 139.483522],
  [36.627668, 139.329552],
  [36.746266, 139.372458],
  [36.773610, 139.353049],
  [36.827043, 139.406701],
  [36.852741, 139.348518],
  [36.907072, 139.395503],
  [36.929407, 139.240657],
  [37.058627, 139.097008],
  [36.987294, 139.047381],
  [36.979076, 138.966547],
  [36.891177, 138.979161],
  [36.883600, 138.923142],
  [36.832614, 138.929016],
  [36.817627, 138.821738],
  [36.761586, 138.817764],
  [36.764169, 138.727022],
  [36.690786, 138.514330],
  [36.655289, 138.529439],
  [36.597728, 138.428667],
];

// Fix Leaflet default icon paths in Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORY_COLORS: Record<Category, string> = {
  nature: '#15803d',
  onsen: '#dc2626',
  history: '#7c3aed',
  gourmet: '#d97706',
  leisure: '#0284c7',
  urban: '#64748b',
};

function createIcon(color: string, visited: boolean) {
  const size = visited ? 14 : 10;
  const border = visited ? 3 : 2;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${visited ? color : '#d1d5db'};
      border:${border}px solid ${visited ? 'white' : '#9ca3af'};
      border-radius:50%;
      box-shadow:${visited ? `0 0 0 2px ${color}40, 0 2px 8px rgba(0,0,0,0.3)` : '0 1px 4px rgba(0,0,0,0.2)'};
    "></div>`,
    iconSize: [size + border * 2, size + border * 2],
    iconAnchor: [(size + border * 2) / 2, (size + border * 2) / 2],
  });
}

const CATEGORY_FILTERS: { key: Category | 'all'; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'nature', label: '🏞 自然' },
  { key: 'onsen', label: '♨️ 温泉' },
  { key: 'history', label: '🏛 歴史' },
  { key: 'gourmet', label: '🍴 グルメ' },
  { key: 'leisure', label: '🎡 レジャー' },
  { key: 'urban', label: '🏙 街' },
];

const GUNMA_CENTER: [number, number] = [36.55, 138.95];

export default function MapView() {
  const state = loadState();
  const visitedSet = new Set(state.visits.map(v => v.spotId));
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [showVisited, setShowVisited] = useState<'all' | 'visited' | 'unvisited'>('all');
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  const visitedCount = state.visits.length;
  const totalSpots = SPOTS.length;
  const pct = Math.round((visitedCount / totalSpots) * 100);

  const filteredSpots = SPOTS.filter(s => {
    if (filter !== 'all' && !s.categories.includes(filter)) return false;
    if (showVisited === 'visited' && !visitedSet.has(s.id)) return false;
    if (showVisited === 'unvisited' && visitedSet.has(s.id)) return false;
    return true;
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.title}>🗺️ 群馬探索マップ</h1>
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statNum}>{visitedCount}</span>
              <span className={styles.statLabel}>訪問済み</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statNum}>{totalSpots - visitedCount}</span>
              <span className={styles.statLabel}>未訪問</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statNum}>{pct}%</span>
              <span className={styles.statLabel}>制覇率</span>
            </div>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className={styles.filterSection}>
        <div className={styles.filterRow}>
          {CATEGORY_FILTERS.map(f => (
            <button
              key={f.key}
              className={`${styles.filterBtn} ${filter === f.key ? styles.filterActive : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className={styles.toggleRow}>
          {(['all', 'visited', 'unvisited'] as const).map(v => (
            <button
              key={v}
              className={`${styles.toggleBtn} ${showVisited === v ? styles.toggleActive : ''}`}
              onClick={() => setShowVisited(v)}
            >
              {v === 'all' ? 'すべて' : v === 'visited' ? '✅ 訪問済み' : '⬜ 未訪問'}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className={styles.mapWrapper}>
        <MapContainer
          center={GUNMA_CENTER}
          zoom={9}
          minZoom={8}
          maxBounds={GUNMA_BOUNDS}
          maxBoundsViscosity={1.0}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Gunma prefecture border */}
          <Polyline
            positions={GUNMA_BOUNDARY}
            pathOptions={{ color: '#1D5035', weight: 2.5, opacity: 0.75, dashArray: undefined }}
          />
          {userPos && (
            <CircleMarker
              center={userPos}
              radius={9}
              fillColor="#1D5035"
              fillOpacity={0.9}
              color="white"
              weight={2}
            />
          )}
          {filteredSpots.map(spot => {
            const visited = visitedSet.has(spot.id);
            const primaryCat = spot.categories[0];
            const color = CATEGORY_COLORS[primaryCat];
            const mapsUrl = `https://maps.google.com/?q=${spot.lat},${spot.lng}`;
            return (
              <Marker
                key={spot.id}
                position={[spot.lat, spot.lng]}
                icon={createIcon(color, visited)}
              >
                <Popup className={styles.popup}>
                  <div className={styles.popupContent}>
                    <div className={styles.popupCats}>
                      {spot.categories.map(c => (
                        <span
                          key={c}
                          className={styles.popupCat}
                          style={{ background: CATEGORY_COLORS[c] + '20', color: CATEGORY_COLORS[c] }}
                        >
                          {CATEGORY_LABELS[c]}
                        </span>
                      ))}
                      {visited && <span className={styles.popupVisited}>✅ 訪問済み</span>}
                    </div>
                    <h3 className={styles.popupName}>{spot.name}</h3>
                    <p className={styles.popupArea}>📍 {spot.area}</p>
                    <p className={styles.popupDesc}>{spot.description}</p>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.mapsLink}
                    >
                      🗺️ Googleマップで見る
                    </a>
                    <button
                      className={styles.popupBtn}
                      style={{ background: visited ? '#f0fdf4' : CATEGORY_COLORS[primaryCat] }}
                      onClick={() => {
                        updateCurrentSpot(spot.id, 'car', 'random');
                        navigate('/mission');
                      }}
                    >
                      {visited
                        ? <span style={{ color: CATEGORY_COLORS[primaryCat], fontWeight: 800 }}>旅の記録を見る →</span>
                        : <span style={{ color: 'white', fontWeight: 800 }}>ここへ行く →</span>
                      }
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <div key={cat} className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: color }} />
            <span>{CATEGORY_LABELS[cat as Category].replace(/^.+ /, '')}</span>
          </div>
        ))}
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ background: '#d1d5db' }} />
          <span>未訪問</span>
        </div>
      </div>

      {/* Area progress */}
      <div className={styles.areaSection}>
        <h3 className={styles.areaSectionTitle}>エリア別制覇率</h3>
        <div className={styles.areaGrid}>
          {['前橋', '高崎', '渋川・伊香保', '吾妻', '利根沼田', '富岡・甘楽', '東毛', '伊勢崎', '安中・碓氷', '西毛（多野）'].map(area => {
            const areaSpots = SPOTS.filter(s => s.area === area);
            const areaVisited = areaSpots.filter(s => visitedSet.has(s.id)).length;
            const areaPct = areaSpots.length > 0 ? Math.round((areaVisited / areaSpots.length) * 100) : 0;
            return (
              <div key={area} className={styles.areaItem}>
                <div className={styles.areaTop}>
                  <span className={styles.areaName}>{area}</span>
                  <span className={styles.areaPct} style={{ color: areaPct >= 100 ? '#d97706' : areaPct > 50 ? '#15803d' : '#6b7280' }}>
                    {areaPct}%
                  </span>
                </div>
                <div className={styles.areaBar}>
                  <div
                    className={styles.areaFill}
                    style={{
                      width: `${areaPct}%`,
                      background: areaPct >= 100 ? '#d97706' : '#15803d',
                    }}
                  />
                </div>
                <span className={styles.areaCount}>{areaVisited}/{areaSpots.length}スポット</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
