import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSpotById } from '../data/spots';
import { CATEGORY_LABELS } from '../types';
import type { Category } from '../types';
import gachaBg from '../assets/gacha-bg.jpg';
import styles from './Gacha.module.css';

type Phase = 'idle' | 'pulling' | 'drop' | 'shake' | 'open' | 'reveal';

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

export default function Gacha() {
  const location = useLocation();
  const navigate = useNavigate();
  const spotId = location.state?.spotId as string | undefined;
  const spot = spotId ? getSpotById(spotId) : null;

  const [phase, setPhase] = useState<Phase>('idle');
  const [capsuleOpen, setCapsuleOpen] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const capsuleColor = spot
    ? (CAPSULE_COLORS[spot.categories[0] as Category] ?? CAPSULE_COLORS.nature)
    : CAPSULE_COLORS.nature;

  useEffect(() => {
    if (!spot) { navigate('/'); return; }
    return () => { timers.current.forEach(clearTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotId]);

  if (!spot) return null;

  function handlePull() {
    if (phase !== 'idle') return;
    setPhase('pulling');
    const t2 = setTimeout(() => setPhase('drop'), 480);
    const t3 = setTimeout(() => setPhase('shake'), 1380);
    const t4 = setTimeout(() => { setPhase('open'); setCapsuleOpen(true); }, 2080);
    const t5 = setTimeout(() => setPhase('reveal'), 2700);
    timers.current = [t2, t3, t4, t5];
  }

  const showCapsule = phase === 'drop' || phase === 'shake' || phase === 'open' || phase === 'reveal';

  const phaseClass =
    phase === 'pulling' ? styles.phasePulling :
    phase === 'drop'    ? styles.phaseDrop :
    phase === 'shake'   ? styles.phaseShake :
    phase === 'open'    ? styles.phaseOpen :
    phase === 'reveal'  ? styles.phaseReveal : '';

  const googleMapsUrl = `https://maps.google.com/?q=${spot.lat},${spot.lng}`;

  return (
    <div
      className={`${styles.page} ${phaseClass}`}
      style={{ backgroundImage: `linear-gradient(to bottom, rgba(9,17,12,0.30) 0%, rgba(9,17,12,0.55) 45%, rgba(7,13,10,0.88) 82%), url(${gachaBg})` }}
    >
      <button className={styles.backBtn} onClick={() => navigate('/')} aria-label="閉じる">✕</button>

      {/* ── MACHINE ── */}
      <div className={styles.machineSection}>
        <div className={styles.machine}>
          <svg viewBox="0 0 260 260" className={styles.machineSvg} role="img" aria-label="群馬ガチャ旅の抽選機">
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

            {/* dome */}
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

            {/* brand plate */}
            <rect x="76" y="58" width="108" height="40" rx="9" fill="#ffffff" opacity="0.94" stroke="#0D2118" strokeWidth="1.5" />
            <text x="130" y="78" textAnchor="middle" fontFamily="'Noto Sans JP', sans-serif" fontWeight={900} fontSize="13" fill="#1D5035">群馬ガチャ旅</text>
            <text x="130" y="91" textAnchor="middle" fontFamily="'Noto Sans JP', sans-serif" fontWeight={700} fontSize="6" fill="#0D2118" letterSpacing="1.5">GUNMA TRAVEL GACHA</text>

            {/* neck ring */}
            <rect x="42" y="137" width="176" height="12" rx="4" fill="#B86A00" stroke="#0D2118" strokeWidth="2" />

            {/* body */}
            <rect x="38" y="149" width="184" height="90" rx="14" fill="url(#gachaBody)" stroke="#0D2118" strokeWidth="3" />
            <rect x="38" y="149" width="184" height="20" rx="14" fill="#ffffff" opacity="0.10" />

            {/* knob mount */}
            <circle cx="130" cy="192" r="38" fill="#0A1A11" />
            <circle cx="130" cy="192" r="34" fill="none" stroke="#2A6645" strokeWidth="6" />
            <circle cx="130" cy="192" r="29" fill="none" stroke="#B86A00" strokeWidth="2.5" />

            <g
              className={`${styles.knobGroup} ${phase === 'idle' ? styles.knobIdle : ''}`}
              role="button"
              tabIndex={0}
              aria-label="つまみを回してガチャを引く"
              onClick={handlePull}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePull(); } }}
            >
              <circle cx="130" cy="192" r="23" fill="url(#gachaKnob)" stroke="#F6E7BE" strokeWidth="1" />
              <rect x="107" y="185" width="46" height="14" rx="7" fill="#FDFCF5" stroke="#E3D6B0" strokeWidth="1" />
              <line x1="109" y1="188.5" x2="151" y2="188.5" stroke="#0D2118" strokeWidth="1" opacity="0.12" />
              <line x1="109" y1="195.5" x2="151" y2="195.5" stroke="#0D2118" strokeWidth="1" opacity="0.16" />
              <ellipse cx="119" cy="180" rx="9" ry="4" fill="#ffffff" opacity="0.6" />
            </g>

            {/* legs */}
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

      {/* ── CAPSULE SECTION ── */}
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
      {phase === 'reveal' && (
        <div className={styles.resultCard}>
          <div className={styles.cardAccent} style={{ background: capsuleColor.top }} />
          <div className={styles.cardHandle} />
          <div className={styles.cardCats}>
            {spot.categories.map(c => (
              <span key={c} className={styles.catChip}>{CATEGORY_LABELS[c]}</span>
            ))}
            <span className={styles.ptsChip}>+{spot.points}pt</span>
          </div>
          <h2 className={styles.spotName}>{spot.name}</h2>
          <p className={styles.spotMeta}>{spot.area}エリア · 前橋から約{spot.distanceFromMaebashi}km</p>
          <p className={styles.spotDesc}>{spot.description}</p>
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
    </div>
  );
}
