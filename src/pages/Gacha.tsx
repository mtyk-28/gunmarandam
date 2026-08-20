import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSpotById } from '../data/spots';
import { CATEGORY_LABELS } from '../types';
import type { Category } from '../types';
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
  { left: 14, top: 16, color: '#1B6C45' },
  { left: 48, top: 10, color: '#C0172B' },
  { left: 84, top: 14, color: '#1A3A8F' },
  { left: 118, top: 10, color: '#CC5500' },
  { left: 31, top: 40, color: '#0077B6' },
  { left: 70, top: 36, color: '#3A3A5C' },
  { left: 106, top: 40, color: '#1B6C45' },
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

  function handleLeverPull() {
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
    <div className={`${styles.page} ${phaseClass}`}>
      <button className={styles.backBtn} onClick={() => navigate('/')}>✕</button>

      {/* ── MACHINE ── */}
      <div className={styles.machineSection}>
        <div className={styles.machine}>
          {/* Dome */}
          <div className={`${styles.dome} ${phase === 'idle' ? styles.domeIdle : ''}`}>
            {MINI_CAPS.map((c, i) => (
              <div
                key={i}
                className={styles.miniCap}
                style={{ left: c.left, top: c.top, background: c.color }}
              />
            ))}
          </div>

          {/* Body */}
          <div className={styles.machineBody}>
            <span className={styles.machineLabel}>GACHA</span>
            <div className={styles.machinePanel} />
            <div className={styles.slot} />

            {/* Lever — interactive button */}
            <button
              className={`${styles.lever} ${phase === 'idle' ? styles.leverIdle : ''}`}
              onClick={handleLeverPull}
              disabled={phase !== 'idle'}
              aria-label="レバーを引く"
            >
              <div className={styles.leverShaft} />
              <div className={styles.leverKnob} />
            </button>
          </div>
        </div>

        <p className={styles.machineStatus}>
          {phase === 'idle'    && 'レバーを引いてください'}
          {phase === 'pulling' && 'ガチャ回転中...'}
          {phase === 'drop'    && ''}
          {phase === 'shake'   && 'どんな場所かな...'}
          {phase === 'open'    && '開封中'}
        </p>
      </div>

      {/* ── CAPSULE SECTION ── */}
      <div className={styles.capsuleSection}>
        {showCapsule && (
          <div className={styles.capsuleArea}>
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
            {capsuleOpen && <div className={styles.openGlow} />}
          </div>
        )}
      </div>

      {/* ── RESULT CARD ── */}
      {phase === 'reveal' && (
        <div className={styles.resultCard}>
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
