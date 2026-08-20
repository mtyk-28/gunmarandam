import { useLocation, useNavigate } from 'react-router-dom';
import styles from './BottomNav.module.css';

const DiceIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3.5"/>
    <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none"/>
  </svg>
);

const TargetIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="5"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);

const MapPinIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M12 2C8.68 2 6 4.68 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.32-2.68-6-6-6z"/>
    <circle cx="12" cy="8" r="2.2"/>
  </svg>
);

const BookIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M4 4h10a2 2 0 012 2v14a2 2 0 01-2 2H4V4z"/>
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2h-2"/>
    <line x1="8" y1="9" x2="12" y2="9"/>
    <line x1="8" y1="13" x2="12" y2="13"/>
  </svg>
);

const NAV_ITEMS = [
  { path: '/',        Icon: DiceIcon,  label: 'ガチャ'  },
  { path: '/mission', Icon: TargetIcon, label: 'ミッション' },
  { path: '/map',     Icon: MapPinIcon, label: 'マップ'  },
  { path: '/history', Icon: BookIcon,   label: '記録'   },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map(({ path, Icon, label }) => (
        <button
          key={path}
          className={`${styles.item} ${location.pathname === path ? styles.active : ''}`}
          onClick={() => navigate(path)}
        >
          <Icon />
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </nav>
  );
}
