import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSpotById } from '../data/spots';
import { loadState, addVisit, getVisitBySpotId } from '../utils/storage';
import { TRANSPORT_LABELS, CATEGORY_LABELS } from '../types';
import type { Visit } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { upsertVisit, uploadPhoto } from '../lib/db';
import styles from './Mission.module.css';

export default function Mission() {
  const navigate = useNavigate();
  const state = loadState();
  const spotId = state.currentSpotId;
  const spot = spotId ? getSpotById(spotId) : null;

  const existingVisit = spotId ? getVisitBySpotId(spotId) : undefined;
  const [completed, setCompleted] = useState<boolean[]>(
    existingVisit?.missionsCompleted ?? (spot ? spot.missions.map(() => false) : [])
  );
  const [comment, setComment] = useState(existingVisit?.comment ?? '');
  const [photo, setPhoto] = useState<string | null>(null);
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!spot) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyIcon}>🎲</p>
        <p className={styles.emptyTitle}>目的地がありません</p>
        <p className={styles.emptyText}>ガチャを回してスポットを決めましょう</p>
        <button className={styles.emptyBtn} onClick={() => navigate('/')}>
          ガチャへ →
        </button>
      </div>
    );
  }

  const transport = state.currentTransport ?? 'car';
  const allDone = completed.every(Boolean);
  const doneCount = completed.filter(Boolean).length;

  function toggle(i: number) {
    setCompleted(prev => prev.map((v, idx) => idx === i ? !v : v));
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function buildVisit(): Visit {
    return {
      id: `${spotId}-${Date.now()}`,
      spotId: spot!.id,
      visitDate: new Date().toISOString(),
      transportType: transport,
      missionsCompleted: completed,
      comment,
      points: allDone
        ? spot!.points
        : Math.round(spot!.points * (doneCount / spot!.missions.length)),
    };
  }

  async function handleRecord() {
    let photoUrl: string | undefined;
    if (user && photo) {
      photoUrl = (await uploadPhoto(photo, user.id, spot!.id)) ?? undefined;
    }
    const visit = { ...buildVisit(), photoUrl };
    addVisit(visit);
    if (user) upsertVisit(visit, user.id).catch(console.error);
    navigate('/');
  }

  const progressPct = spot.missions.length > 0
    ? (doneCount / spot.missions.length) * 100
    : 0;

  return (
    <div className={styles.page}>
      {/* Destination hero */}
      <div className={styles.hero}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>← 戻る</button>

        <div className={styles.heroContent}>
          <div className={styles.catRow}>
            {spot.categories.map(c => (
              <span key={c} className={styles.catChip}>{CATEGORY_LABELS[c]}</span>
            ))}
          </div>
          <h1 className={styles.destName}>{spot.name}</h1>
          <p className={styles.destMeta}>{spot.area}エリア · {TRANSPORT_LABELS[transport]}</p>
        </div>

        {/* Compact progress arc */}
        <div className={styles.progressArc}>
          <svg viewBox="0 0 48 48" className={styles.arcSvg}>
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
            <circle
              cx="24" cy="24" r="20" fill="none"
              stroke={allDone ? '#E5A81E' : '#FFFFFF'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - progressPct / 100)}`}
              transform="rotate(-90 24 24)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <span className={styles.arcNum}>{doneCount}/{spot.missions.length}</span>
        </div>
      </div>

      {/* Scrollable body */}
      <div className={styles.body}>
        {/* Access */}
        <section className={styles.section}>
          <p className={styles.secLabel}>ACCESS</p>
          <p className={styles.accessText}>{spot.access}</p>
          <div className={styles.chips}>
            <span className={styles.chip}>前橋から約{spot.distanceFromMaebashi}km</span>
            <span className={styles.chip}>+{spot.points}pt</span>
          </div>
        </section>

        {/* Missions */}
        <section className={styles.section}>
          <p className={styles.secLabel}>MISSIONS</p>
          <div className={styles.missionList}>
            {spot.missions.map((m, i) => (
              <button
                key={i}
                className={`${styles.missionItem} ${completed[i] ? styles.mDone : ''}`}
                onClick={() => toggle(i)}
              >
                <span className={`${styles.mCheck} ${completed[i] ? styles.mCheckDone : ''}`}>
                  {completed[i] && '✓'}
                </span>
                <span className={styles.mText}>{m}</span>
              </button>
            ))}
          </div>
          {allDone && (
            <div className={styles.allDoneBanner}>
              全ミッション達成！ +{spot.points}pt
            </div>
          )}
        </section>

        {/* Photo */}
        <section className={styles.section}>
          <p className={styles.secLabel}>PHOTO</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handlePhoto}
          />
          {photo ? (
            <div className={styles.photoWrap}>
              <img src={photo} alt="訪問写真" className={styles.photoImg} />
              <button className={styles.photoRetake} onClick={() => fileRef.current?.click()}>
                撮り直す
              </button>
            </div>
          ) : (
            <button className={styles.photoAdd} onClick={() => fileRef.current?.click()}>
              <span className={styles.photoAddIcon}>📷</span>
              <span className={styles.photoAddText}>写真を追加</span>
            </button>
          )}
        </section>

        {/* Comment */}
        <section className={styles.section}>
          <p className={styles.secLabel}>MEMO</p>
          <textarea
            className={styles.memo}
            placeholder="今日の旅の感想…"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
          />
        </section>
      </div>

      {/* Fixed action bar */}
      <div className={styles.actionBar}>
        <button
          className={`${styles.recordBtn} ${allDone ? styles.recordBtnGold : ''}`}
          onClick={handleRecord}
        >
          {allDone ? `記録して次の冒険へ  +${spot.points}pt` : '訪問を記録する'}
        </button>
      </div>
    </div>
  );
}
