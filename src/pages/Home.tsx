import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TransportType, TravelStyle, Category, Spot } from '../types';
import { STYLE_LABELS, LEVEL_THRESHOLDS, CATEGORY_LABELS } from '../types';
import { drawGacha, getEligibleCount, choosePrimaryTransport } from '../utils/gacha';
import {
  getVisitedSpotIds,
  updateCurrentSpot,
  loadState,
  getVisitBySpotId,
  savePreferences,
  loadPreferences,
} from '../utils/storage';
import { SPOTS, getSpotById } from '../data/spots';
import gachaBg from '../assets/gacha-bg.jpg';
import styles from './Home.module.css';

type Phase = 'idle' | 'pulling' | 'drop' | 'shake' | 'open' | 'reveal';

const TRANSPORTS: TransportType[] = ['car', 'train', 'bicycle', 'walking'];
const STYLES: TravelStyle[] = ['random', 'nature', 'onsen', 'gourmet', 'photo', 'active'];

const T_EMOJI: Record<TransportType, string> = {
  car: '🚗', train: '🚆', bicycle: '🚲', walking: '🚶',
};
const T_LABEL: Record<TransportType, string> = {
  car: '車', train: '電車', bicycle: '自転車', walking: '徒歩',
};

const CAPSULE_COLORS: Record<Category, { top: string; bottom: string }> = {
  nature:  { top: '#1B6C45', bottom: '#74C69D' },
  onsen:   { top: '#C0172B', bottom: '#FF8FA3' },
  history: { top: '#1A3A8F', bottom: '#90AAD4' },
  gourmet: { top: '#CC5500', bottom: '#FFB347' },
  leisure: { top: '#0077B6', bottom: '#90E0EF' },
  urban:   { top: '#3A3A5C', bottom: '#B8B8D8' },
};

const MINI_CAPS = [
  { cx: 92,  cy: 60, r: 15, top: '#1B6C45', bottom: '#74C69D' },
  { cx: 130, cy: 44, r: 15, top: '#C0172B', bottom: '#FF8FA3' },
  { cx: 168, cy: 63, r: 15, top: '#1A3A8F', bottom: '#90AAD4' },
  { cx: 104, cy: 92, r: 14, top: '#CC5500', bottom: '#FFB347' },
  { cx: 142, cy: 100, r: 14, top: '#0077B6', bottom: '#90E0EF' },
  { cx: 176, cy: 90, r: 13, top: '#3A3A5C', bottom: '#B8B8D8' },
  { cx: 78,  cy: 90, r: 12, top: '#1A3A8F', bottom: '#90AAD4' },
  { cx: 122, cy: 120, r: 12, top: '#1B6C45', bottom: '#74C69D' },
  { cx: 158, cy: 122, r: 11, top: '#CC5500', bottom: '#FFB347' },
];

const SMOKE_PUFFS = [
  { dx: -28, delay: 0 },
  { dx: -8,  delay: 90 },
  { dx: 14,  delay: 40 },
  { dx: 32,  delay: 130 },
  { dx: 0,   delay: 180 },
];

type LocationStatus = 'idle' | 'pending' | 'granted' | 'denied';

export default function Home() {
  const savedPrefs = loadPreferences();

  const [transports, setTransports] = useState<TransportType[] | 'any'>(
    savedPrefs?.transports ?? ['car']
  );
  const [style, setStyle] = useState<TravelStyle>(savedPrefs?.style ?? 'random');
  const [settingsOpen, setSettingsOpen] = useState(!savedPrefs);
  const [error, setError] = useState('');

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');

  const [phase, setPhase] = useState<Phase>('idle');
  const [capsuleOpen, setCapsuleOpen] = useState(false);
  const [drawnSpot, setDrawnSpot] = useState<Spot | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const navigate = useNavigate();

  const state = loadState();
  const visitedIds = getVisitedSpotIds();
  const totalSpots = SPOTS.length;
  const visitedCount = visitedIds.length;
  const completionPct = Math.round((visitedCount / totalSpots) * 100);

  const currentLevel =
    [...LEVEL_THRESHOLDS].reverse().find(l => state.totalPoints >= l.minPoints) ??
    LEVEL_THRESHOLDS[0];

  const currentSpotId = state.currentSpotId;
  const isLocked = !!currentSpotId && !visitedIds.includes(currentSpotId);
  const lockedSpot = isLocked && currentSpotId ? getSpotById(currentSpotId) : null;
  const currentVisit = isLocked && currentSpotId ? getVisitBySpotId(currentSpotId) : undefined;
  const completedMissions = currentVisit
    ? currentVisit.missionsCompleted.filter(Boolean).length
    : 0;

  const isAny = transports === 'any';

  useEffect(() => {
    if (!navigator.geolocation) { setLocationStatus('denied'); return; }
    setLocationStatus('pending');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('granted');
      },
      () => setLocationStatus('denied'),
      { timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    return () => { timers.current.forEach(clearTimeout); };
  }, []);

  function handleTransportClick(t: TransportType) {
    let next: TransportType[] | 'any';
    if (isAny) {
      next = [t];
    } else {
      const cur = transports as TransportType[];
      const has = cur.includes(t);
      if (has && cur.length === 1) return; // keep at least one
      next = has ? cur.filter(x => x !== t) : [...cur, t];
    }
    setTransports(next);
    savePreferences(next, style);
  }

  function handleAnyClick() {
    setTransports('any');
    savePreferences('any', style);
  }

  function handleStyleChange(s: TravelStyle) {
    setStyle(s);
    savePreferences(transports, s);
  }

  function handleGacha() {
    if (isLocked || phase !== 'idle') return;
    const spot = drawGacha(transports, style, visitedIds, userLocation?.lat, userLocation?.lng);
    if (!spot) {
      setError('条件に合うスポットが見つかりません。設定を変えてみてください。');
      return;
    }
    setError('');
    savePreferences(transports, style);
    const primaryTransport = choosePrimaryTransport(spot, transports);
    updateCurrentSpot(spot.id, primaryTransport, style);
    setDrawnSpot(spot);
    setSettingsOpen(false);

    setPhase('pulling');
    const t2 = setTimeout(() => setPhase('drop'), 480);
    const t3 = setTimeout(() => setPhase('shake'), 1380);
    const t4 = setTimeout(() => { setPhase('open'); setCapsuleOpen(true); }, 2080);
    const t5 = setTimeout(() => setPhase('reveal'), 2700);
    timers.current = [t2, t3, t4, t5];
  }

  const eligibleCount = getEligibleCount(transports, userLocation?.lat, userLocation?.lng);

  const transportSummary = isAny
    ? 'おまかせ'
    : (transports as TransportType[]).map(t => `${T_EMOJI[t]} ${T_LABEL[t]}`).join(' · ');

  const capsuleColor = drawnSpot
    ? (CAPSULE_COLORS[drawnSpot.categories[0] as Category] ?? CAPSULE_COLORS.nature)
    : CAPSULE_COLORS.nature;

  const showCapsule = phase === 'drop' || phase === 'shake' || phase === 'open' || phase === 'reveal';

  const phaseClass =
    phase === 'pulling' ? styles.phasePulling :
    phase === 'drop'    ? styles.phaseDrop :
    phase === 'shake'   ? styles.phaseShake :
    phase === 'open'    ? styles.phaseOpen :
    phase === 'reveal'  ? styles.phaseReveal : '';

  const googleMapsUrl = drawnSpot ? `https://maps.google.com/?q=${drawnSpot.lat},${drawnSpot.lng}` : '';

  const showLockedQuest = isLocked && phase === 'idle';

  return (
    <div
      className={`${styles.page} ${phaseClass}`}
      style={{ backgroundImage: `linear-gradient(to bottom, rgba(9,17,12,0.30) 0%, rgba(9,17,12,0.50) 45%, rgba(7,13,10,0.86) 82%), url(${gachaBg})` }}
    >
      <header className={styles.topBar}>
        <div className={styles.appName}>群馬旅ガチャ</div>
        <div className={styles.levelTag}>Lv.{currentLevel.level}　{currentLevel.title}</div>
      </header>

      {showLockedQuest && lockedSpot ? (
        <div className={styles.questSection}>
          <span className={styles.questBadge}>冒険中</span>
          <h2 className={styles.questName}>{lockedSpot.name}</h2>
          <p className={styles.questMeta}>{lockedSpot.area}エリア</p>
          <div className={styles.missionRow}>
            {lockedSpot.missions.map((_, i) => (
              <span
                key={i}
                className={`${styles.mDot} ${i < completedMissions ? styles.mDotDone : ''}`}
              />
            ))}
            <span className={styles.missionCount}>
              {completedMissions} / {lockedSpot.missions.length} ミッション
            </span>
          </div>
          <button className={styles.continueBtn} onClick={() => navigate('/mission')}>
            ミッションを続ける →
          </button>
          <p className={styles.lockHint}>ミッション完了後にガチャが解放されます</p>
        </div>
      ) : (
        <>
          <div className={styles.signboard}>
            <span className={styles.signboardTitle}>群馬ガチャ</span>
            <span className={styles.signboardSub}>今日はどこに行こう？</span>
          </div>

          {/* ── MACHINE ── */}
          <div className={styles.machineSection}>
            <div className={styles.machine}>
              <svg viewBox="0 0 260 260" className={styles.machineSvg} role="img" aria-label="群馬旅ガチャの抽選機">
                <defs>
                  <clipPath id="gachaDomeClip">
                    <path d="M130,8 C182,8 216,42 216,84 C216,116 216,140 216,140 L44,140 C44,140 44,116 44,84 C44,42 78,8 130,8 Z" />
                  </clipPath>
                  <radialGradient id="gachaDomeGlass" cx="35%" cy="25%" r="80%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.70" />
                    <stop offset="45%" stopColor="#E9F1E5" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#C4D9BC" stopOpacity="0.12" />
                  </radialGradient>
                  <linearGradient id="gachaBody" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0F2418" />
                    <stop offset="18%" stopColor="#2A6645" />
                    <stop offset="55%" stopColor="#1D5035" />
                    <stop offset="100%" stopColor="#0A1A11" />
                  </linearGradient>
                  <radialGradient id="gachaKnob" cx="35%" cy="30%" r="75%">
                    <stop offset="0%" stopColor="#F6E7BE" />
                    <stop offset="100%" stopColor="#B86A00" />
                  </radialGradient>
                </defs>

                <path
                  d="M130,8 C182,8 216,42 216,84 C216,116 216,140 216,140 L44,140 C44,140 44,116 44,84 C44,42 78,8 130,8 Z"
                  fill="#E9F1E5" stroke="#0D2118" strokeWidth="3"
                  className={phase === 'idle' ? styles.domePulse : ''}
                />

                <g clipPath="url(#gachaDomeClip)">
                  <g className={styles.capsuleField}>
                    {MINI_CAPS.map((c, i) => (
                      <g
                        key={i}
                        className={styles.capsuleIdle}
                        style={{ animationDelay: `${-(i * 0.4)}s` }}
                      >
                        <circle cx={c.cx} cy={c.cy} r={c.r} fill={c.top} />
                        <path d={`M${c.cx - c.r},${c.cy} A${c.r},${c.r} 0 0 0 ${c.cx + c.r},${c.cy} Z`} fill="#FDFBF4" />
                        <line x1={c.cx - c.r} y1={c.cy} x2={c.cx + c.r} y2={c.cy} stroke="#0D2118" strokeWidth="1" opacity="0.3" />
                        <ellipse cx={c.cx - c.r * 0.32} cy={c.cy - c.r * 0.38} rx={c.r * 0.32} ry={c.r * 0.2} fill="#fff" opacity="0.55" />
                      </g>
                    ))}
                  </g>
                </g>

                <path
                  d="M130,8 C182,8 216,42 216,84 C216,116 216,140 216,140 L44,140 C44,140 44,116 44,84 C44,42 78,8 130,8 Z"
                  fill="url(#gachaDomeGlass)"
                />
                <path d="M66,32 C78,20 98,13 114,11" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
                <path
                  d="M130,8 C182,8 216,42 216,84 C216,116 216,140 216,140 L44,140 C44,140 44,116 44,84 C44,42 78,8 130,8 Z"
                  fill="none" stroke="#0D2118" strokeWidth="3"
                />

                <rect x="76" y="58" width="108" height="40" rx="9" fill="#ffffff" opacity="0.94" stroke="#0D2118" strokeWidth="1.5" />
                <text x="130" y="78" textAnchor="middle" fontFamily="'Noto Sans JP', sans-serif" fontWeight={900} fontSize="13" fill="#1D5035">群馬旅ガチャ</text>
                <text x="130" y="91" textAnchor="middle" fontFamily="'Noto Sans JP', sans-serif" fontWeight={700} fontSize="6" fill="#0D2118" letterSpacing="1.5">GUNMA TRAVEL GACHA</text>

                <rect x="42" y="137" width="176" height="12" rx="4" fill="#B86A00" stroke="#0D2118" strokeWidth="2" />

                <rect x="38" y="149" width="184" height="90" rx="14" fill="url(#gachaBody)" stroke="#0D2118" strokeWidth="3" />
                <rect x="38" y="149" width="184" height="20" rx="14" fill="#ffffff" opacity="0.10" />

                <circle cx="130" cy="192" r="38" fill="#0A1A11" />
                <circle cx="130" cy="192" r="34" fill="none" stroke="#2A6645" strokeWidth="6" />
                <circle cx="130" cy="192" r="29" fill="none" stroke="#B86A00" strokeWidth="2.5" />

                <g
                  className={`${styles.knobGroup} ${phase === 'idle' ? styles.knobIdle : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label="つまみを回してガチャを引く"
                  onClick={handleGacha}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleGacha(); } }}
                >
                  <circle cx="130" cy="192" r="23" fill="url(#gachaKnob)" stroke="#F6E7BE" strokeWidth="1" />
                  <rect x="107" y="185" width="46" height="14" rx="7" fill="#FDFCF5" stroke="#E3D6B0" strokeWidth="1" />
                  <line x1="109" y1="188.5" x2="151" y2="188.5" stroke="#0D2118" strokeWidth="1" opacity="0.12" />
                  <line x1="109" y1="195.5" x2="151" y2="195.5" stroke="#0D2118" strokeWidth="1" opacity="0.16" />
                  <ellipse cx="119" cy="180" rx="9" ry="4" fill="#ffffff" opacity="0.6" />
                </g>

                <circle cx="72" cy="252" r="7" fill="#0A1A11" />
                <circle cx="188" cy="252" r="7" fill="#0A1A11" />
              </svg>
            </div>

            <p className={styles.machineStatus}>
              {phase === 'idle'    && 'つまみを回してね'}
              {phase === 'pulling' && 'ガチャ回転中...'}
              {phase === 'shake'   && 'どんな場所かな...'}
              {phase === 'open'    && '開封中'}
            </p>
          </div>

          {phase === 'idle' && (
            <div className={styles.controlPanel}>
              {!settingsOpen ? (
                <div className={styles.savedBar}>
                  <div className={styles.savedSummary}>
                    <span className={styles.savedText}>{transportSummary}</span>
                    <span className={styles.savedSep}>·</span>
                    <span className={styles.savedText}>{STYLE_LABELS[style]}</span>
                  </div>
                  <button className={styles.changeBtn} onClick={() => setSettingsOpen(true)}>
                    変更する
                  </button>
                </div>
              ) : (
                <div className={styles.configBlock}>
                  <div className={styles.configSection}>
                    <p className={styles.configLabel}>移動手段</p>
                    <div className={styles.anyRow}>
                      <button
                        className={`${styles.anyBtn} ${isAny ? styles.anyActive : ''}`}
                        onClick={handleAnyClick}
                      >
                        🎲 おまかせ
                      </button>
                    </div>
                    <div className={styles.transportRow}>
                      {TRANSPORTS.map(t => {
                        const selected = !isAny && (transports as TransportType[]).includes(t);
                        return (
                          <button
                            key={t}
                            className={`${styles.tBtn} ${selected ? styles.tActive : ''}`}
                            onClick={() => handleTransportClick(t)}
                          >
                            <span className={styles.tEmoji}>{T_EMOJI[t]}</span>
                            <span className={styles.tLabel}>{T_LABEL[t]}</span>
                          </button>
                        );
                      })}
                    </div>
                    {locationStatus === 'granted' && (
                      <p className={styles.eligibleNote}>対象スポット {eligibleCount}件</p>
                    )}
                  </div>

                  <div className={styles.configSection}>
                    <p className={styles.configLabel}>テーマ</p>
                    <div className={styles.styleGrid}>
                      {STYLES.map(s => (
                        <button
                          key={s}
                          className={`${styles.sBtn} ${style === s ? styles.sActive : ''}`}
                          onClick={() => handleStyleChange(s)}
                        >
                          {STYLE_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {savedPrefs && (
                    <button className={styles.collapseBtn} onClick={() => setSettingsOpen(false)}>
                      閉じる
                    </button>
                  )}
                </div>
              )}

              {error && <p className={styles.error}>{error}</p>}

              <button className={styles.gachaBtn} onClick={handleGacha}>
                <span className={styles.gachaBtnText}>ガチャを回す！</span>
                <span className={styles.gachaBtnSub}>タップしてスタート</span>
              </button>
            </div>
          )}

          {phase === 'idle' && (
            <div className={styles.statsCard}>
              <p className={styles.statsCardTitle}>🍃 これまでの旅の記録 🍃</p>
              <div className={styles.statsCardRow}>
                <span className={styles.statsCardLabel}>訪問した場所</span>
                <span className={styles.statsCardValue}>
                  {visitedCount}<span className={styles.statsCardOf}> / {totalSpots}箇所</span>
                </span>
              </div>
              <div className={styles.statsCardRow}>
                <span className={styles.statsCardLabel}>群馬探索率</span>
                <span className={styles.statsCardPct}>{completionPct}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${completionPct || 0.5}%` }} />
              </div>
              <button className={styles.historyBtn} onClick={() => navigate('/history')}>
                📖 記録を見る ›
              </button>
            </div>
          )}

          {/* ── CAPSULE ANIMATION ── */}
          <div className={styles.capsuleSection}>
            {showCapsule && (
              <div className={styles.capsuleArea}>
                {capsuleOpen && (
                  <div className={styles.smokeField}>
                    {SMOKE_PUFFS.map((p, i) => (
                      <span
                        key={i}
                        className={styles.smokePuff}
                        style={{ '--dx': `${p.dx}px`, animationDelay: `${p.delay}ms` } as React.CSSProperties}
                      />
                    ))}
                  </div>
                )}
                <div className={styles.capsuleWrap}>
                  <div
                    className={`${styles.capsuleTop} ${capsuleOpen ? styles.capsuleTopOpen : ''}`}
                    style={{ background: capsuleColor.top }}
                  >
                    <div className={styles.shine} />
                    <div className={styles.shineSmall} />
                  </div>
                  <div
                    className={styles.capsuleBottom}
                    style={{ background: capsuleColor.bottom }}
                  />
                </div>
                {capsuleOpen && (
                  <div
                    className={styles.openGlow}
                    style={{ background: `radial-gradient(circle, ${capsuleColor.top}E6 0%, ${capsuleColor.bottom}66 40%, transparent 70%)` }}
                  />
                )}
              </div>
            )}
          </div>

          {/* ── RESULT CARD ── */}
          {phase === 'reveal' && drawnSpot && (
            <div className={styles.resultCard}>
              <div className={styles.cardAccent} style={{ background: capsuleColor.top }} />
              <div className={styles.cardHandle} />
              <div className={styles.cardCats}>
                {drawnSpot.categories.map(c => (
                  <span key={c} className={styles.catChip}>{CATEGORY_LABELS[c]}</span>
                ))}
                <span className={styles.ptsChip}>+{drawnSpot.points}pt</span>
              </div>
              <h2 className={styles.spotName}>{drawnSpot.name}</h2>
              <p className={styles.spotMeta}>{drawnSpot.area}エリア · 前橋から約{drawnSpot.distanceFromMaebashi}km</p>
              <p className={styles.spotDesc}>{drawnSpot.description}</p>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.mapsLink}
              >
                📍 Googleマップで見る
              </a>
              <button className={styles.goBtn} onClick={() => navigate('/mission')}>
                冒険をはじめる →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
