import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Header.module.css';

export function Header() {
  const location = useLocation();
  const { isConnected } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoText}>BRoll</span>
        </Link>

        <nav className={styles.nav}>
          <Link
            to="/"
            className={`${styles.navLink} ${location.pathname === '/' ? styles.active : ''}`}
          >
            Browse
          </Link>
          <Link
            to="/record"
            className={`${styles.navLink} ${location.pathname === '/record' ? styles.active : ''}`}
          >
            Upload
          </Link>
          <Link
            to="/settings"
            className={`${styles.navLink} ${location.pathname === '/settings' ? styles.active : ''}`}
          >
            <span className={`${styles.statusDot} ${isConnected ? styles.connected : ''}`} />
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}
