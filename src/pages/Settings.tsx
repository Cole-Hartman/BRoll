import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common/Button';
import styles from './Settings.module.css';

export function Settings() {
  const { serverUrl, apiKey, isConnected, isLoading, configure, disconnect } = useAuth();
  const [url, setUrl] = useState(serverUrl);
  const [key, setKey] = useState(apiKey);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const success = await configure(url.trim(), key.trim());
    setTestResult(success ? 'success' : 'error');
    setIsTesting(false);
  };

  const handleDisconnect = () => {
    disconnect();
    setUrl('');
    setKey('');
    setTestResult(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.description}>
            Connect to your Immich server to browse and upload video journals.
          </p>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="serverUrl" className={styles.label}>
              Server URL
            </label>
            <input
              id="serverUrl"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-immich-server.com"
              className={styles.input}
              required
            />
            <p className={styles.hint}>
              The URL of your Immich instance (e.g., https://photos.example.com)
            </p>
          </div>

          <div className={styles.field}>
            <label htmlFor="apiKey" className={styles.label}>
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Your Immich API key"
              className={styles.input}
              required
            />
            <p className={styles.hint}>
              Generate an API key in Immich under Account Settings → API Keys
            </p>
          </div>

          {testResult === 'success' && (
            <div className={`${styles.alert} ${styles.success}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Connected successfully!
            </div>
          )}

          {testResult === 'error' && (
            <div className={`${styles.alert} ${styles.error}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              Connection failed. Check your URL and API key.
            </div>
          )}

          <div className={styles.actions}>
            <Button type="submit" isLoading={isTesting || isLoading}>
              {isConnected ? 'Update Connection' : 'Connect'}
            </Button>
            {isConnected && (
              <Button type="button" variant="ghost" onClick={handleDisconnect}>
                Disconnect
              </Button>
            )}
          </div>
        </form>

        <div className={styles.status}>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Status</span>
            <span className={`${styles.statusValue} ${isConnected ? styles.connected : ''}`}>
              <span className={styles.statusDot} />
              {isConnected ? 'Connected' : 'Not connected'}
            </span>
          </div>
          {isConnected && serverUrl && (
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Server</span>
              <span className={styles.statusValue}>{serverUrl}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
