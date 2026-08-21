import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchVisits, deleteVisit, updateVisitMemo } from '../lib/db';
import { updateCurrentSpot } from '../utils/storage';
import { getSpotById, SPOTS } from '../data/spots';
import { TRANSPORT_LABELS, LEVEL_THRESHOLDS } from '../types';
import type { Visit } from '../types';
import styles from './History.module.css';

export default function History() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const remote = await fetchVisits(user.id);
      setVisits(remote);
      setDataLoading(false);
    })();
  }, [user]);

  const totalPoints = visits.reduce((sum, v) => sum + v.points, 0);
  const visitedCount = visits.length;
  const pct = Math.round((visitedCount / SPOTS.length) * 100);

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

  function startEdit(visit: Visit) {
    setEditingId(visit.id);
    setEditText(visit.comment);
    setDeletingId(null);
  }

  async function saveEdit(id: string) {
    await updateVisitMemo(id, editText);
    setVisits(prev => prev.map(v => v.id === id ? { ...v, comment: editText } : v));
    setEditingId(null);
  }

  async function confirmDelete(id: string) {
    await deleteVisit(id);
    setVisits(prev => prev.filter(v => v.id !== id));
    setDeletingId(null);
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.topRow}>
            <h1 className={styles.title}>📖 旅の記録</h1>
            <div className={styles.headerRight}>
              <div className={styles.levelBadge}>
                <span className={styles.levelNum}>Lv.{currentLevel.level}</span>
                <span className={styles.levelTitle}>{currentLevel.title}</span>
              </div>
              <button className={styles.logoutBtn} onClick={signOut} title="ログアウト">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
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
        {dataLoading ? (
          <div className={styles.loadingWrap}>
            <span className={styles.loadingText}>読み込み中…</span>
          </div>
        ) : visitedCount === 0 ? (
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
              const isEditing = editingId === visit.id;
              const isDeleting = deletingId === visit.id;

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

                    {visit.photoUrl && (
                      <img
                        src={visit.photoUrl}
                        alt={`${spot.name}の写真`}
                        className={styles.visitPhoto}
                      />
                    )}

                    {isEditing ? (
                      <div className={styles.editWrap}>
                        <textarea
                          className={styles.editArea}
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          rows={3}
                          autoFocus
                          placeholder="メモを入力…"
                        />
                        <div className={styles.editActions}>
                          <button className={styles.cancelBtn} onClick={() => setEditingId(null)}>キャンセル</button>
                          <button className={styles.saveBtn} onClick={() => saveEdit(visit.id)}>保存</button>
                        </div>
                      </div>
                    ) : (
                      visit.comment && (
                        <p className={styles.visitComment}>💬 {visit.comment}</p>
                      )
                    )}

                    {isDeleting ? (
                      <div className={styles.confirmRow}>
                        <span className={styles.confirmText}>本当に削除しますか？</span>
                        <button className={styles.cancelBtn} onClick={() => setDeletingId(null)}>いいえ</button>
                        <button className={styles.deleteConfirmBtn} onClick={() => confirmDelete(visit.id)}>削除</button>
                      </div>
                    ) : (
                      <div className={styles.cardActions}>
                        <button
                          className={styles.revisitBtn}
                          onClick={() => {
                            updateCurrentSpot(spot.id, visit.transportType, 'random');
                            navigate('/mission');
                          }}
                        >
                          詳細・再訪問 →
                        </button>
                        <div className={styles.mgmtBtns}>
                          <button className={styles.editBtn} onClick={() => startEdit(visit)}>編集</button>
                          <button className={styles.deleteBtn} onClick={() => { setDeletingId(visit.id); setEditingId(null); }}>削除</button>
                        </div>
                      </div>
                    )}
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
