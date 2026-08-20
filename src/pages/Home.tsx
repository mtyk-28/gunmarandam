import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TransportType, TravelStyle } from '../types';
import { STYLE_LABELS, LEVEL_THRESHOLDS } from '../types';
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
import styles from './Home.module.css';

const TRANSPORTS: TransportType[] = ['car', 'train', 'bicycle', 'walking'];
const STYLES: TravelStyle[] = ['random', 'nature', 'onsen', 'gourmet', 'photo', 'active'];

const T_EMOJI: Record<TransportType, string> = {
  car: '🚗', train: '🚆', bicycle: '🚲', walking: '🚶',
};
const T_LABEL: Record<TransportType, string> = {
  car: '車', train: '電車', bicycle: '自転車', walking: '徒歩',
};

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
    if (isLocked) return;
    const spot = drawGacha(transports, style, visitedIds, userLocation?.lat, userLocation?.lng);
    if (!spot) {
      setError('条件に合うスポットが見つかりません。設定を変えてみてください。');
      return;
    }
    setError('');
    savePreferences(transports, style);
    const primaryTransport = choosePrimaryTransport(spot, transports);
    updateCurrentSpot(spot.id, primaryTransport, style);
    navigate('/gacha', { state: { spotId: spot.id } });
  }

  const eligibleCount = getEligibleCount(transports, userLocation?.lat, userLocation?.lng);

  // Build summary label for collapsed settings
  const transportSummary = isAny
    ? 'おまかせ'
    : (transports as TransportType[]).map(t => `${T_EMOJI[t]} ${T_LABEL[t]}`).join(' · ');

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.appName}>群馬ガチャ旅</div>
        <div className={styles.levelTag}>Lv.{currentLevel.level}　{currentLevel.title}</div>
      </header>

      <div className={styles.statsSection}>
        <div className={styles.statBig}>
          {visitedCount}
          <span className={styles.statBigOf}>/{totalSpots}</span>
        </div>
        <div className={styles.statLabel}>スポット探索済み</div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${completionPct || 0.5}%` }} />
        </div>
        <div className={styles.statMeta}>
          <span className={styles.statPct}>{completionPct}% 完了</span>
          <span className={styles.locationBadge}>
            {locationStatus === 'pending' && '📍 取得中...'}
            {locationStatus === 'granted' && '📍 現在地から'}
            {locationStatus === 'denied' && '📍 前橋市基準'}
          </span>
        </div>
      </div>

      <div className={styles.divider} />

      {isLocked && lockedSpot ? (
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
        <main className={styles.main}>
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
            <span className={styles.gachaBtnText}>ガチャを引く</span>
            <span className={styles.gachaBtnArrow}>→</span>
          </button>
        </main>
      )}
    </div>
  );
}
