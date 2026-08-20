import { useNavigate } from 'react-router-dom';
import { loadState, updateCurrentSpot } from '../utils/storage';
import { getSpotById, SPOTS } from '../data/spots';
import { TRANSPORT_LABELS, LEVEL_THRESHOLDS } from '../types';
import styles from './History.module.css';

export default function History() {
  const navigate = useNavigate();
  const state = loadState();
  const { visits, totalPoints } = state;

  const totalSpots = SPOTS.length;
  const visitedCount = visits.length;
  const pct = Math.round((visitedCount / totalSpots) * 100);

  const currentLevel = [...LEVEL_THRESHOLDS].reverse().find(l => totalPoints >= l.minPoints) ?? LEVEL_THRESHOLDS[0];
  const nextLevel = LEVEL_THRESHOLDS.find(l => l.minPoints > totalPoints);
  const nextPct = nextLevel
    ? Math.round(((totalPoints - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100)
    : 100;

  const sorted = [...visits].sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());

  function fmt(iso: string) {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.topRow}>
            <h1 className={styles.title}>📖 旅の記録</h1>
            <div className={styles.levelBadge}>
              <span className={styles.levelNum}>Lv.{currentLevel.level}</span>
              <span className={styles.levelTitle}>{currentLevel.title}</span>
            </div>
          </div>

          <div className={styles.statsCards}>
            <div className={styles.statCard}>
              <span className={styles.statNum}>{totalPoints.toLocaleString()}</span>
              <span className={styles.statLabel}>獲得ポイント</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNum}>{visitedCount}</span>
              <span className={styles.statLabel}>訪問スポット</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNum}>{pct}%</span>
              <span className={styles.statLabel}>群馬制覇率</span>
            </div>
          </div>

          {nextLevel && (
            <p className={styles.ptNext}>
              Lv.{currentLevel.level + 1}「{nextLevel.title}」まで {nextLevel.minPoints - totalPoints}pt
            </p>
          )}
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${nextPct}%` }} />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {visitedCount === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIllustration}>🗺️</span>
            <h2 className={styles.emptyTitle}>まだ旅の記録がありません</h2>
            <p className={styles.emptyText}>
              ガチャを回して群馬の知らないスポットへ出かけよう。<br/>
              訪問するとここに思い出が積み重なっていきます。
            </p>
            <button className={styles.startBtn} onClick={() => navigate('/')}>
              最初のガチャを回す 🎲
            </button>
          </div>
        ) : (
          <div className={styles.visitList}>
            {sorted.map(visit => {
              const spot = getSpotById(visit.spotId);
              if (!spot) return null;
              const allDone = visit.missionsCompleted.every(Boolean);
              const doneCount = visit.missionsCompleted.filter(Boolean).length;
              return (
                <div key={visit.id} className={styles.visitCard}>
                  <div className={styles.visitBody}>
                    <div className={styles.visitTop}>
                      <h3 className={styles.visitName}>{spot.name}</h3>
                      <span className={styles.visitPts}>+{visit.points}pt</span>
                    </div>
                    <p className={styles.visitMeta}>
                      {fmt(visit.visitDate)} · {TRANSPORT_LABELS[visit.transportType]} · {spot.area}
                    </p>
                    <div className={styles.missions}>
                      <div className={styles.missionIcons}>
                        {visit.missionsCompleted.map((done, i) => (
                          <span key={i}>{done ? '✅' : '⬜'}</span>
                        ))}
                      </div>
                      <span className={`${styles.missionLabel} ${allDone ? styles.missionLabelDone : ''}`}>
                        {allDone ? 'コンプリート！' : `${doneCount}/${spot.missions.length}達成`}
                      </span>
                    </div>
                    {visit.comment && (
                      <p className={styles.visitComment}>💬 {visit.comment}</p>
                    )}
                    <button
                      className={styles.revisitBtn}
                      onClick={() => {
                        updateCurrentSpot(spot.id, visit.transportType, 'random');
                        navigate('/mission');
                      }}
                    >
                      詳細・再訪問 →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
