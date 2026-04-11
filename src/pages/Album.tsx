import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAssets } from '../hooks/useAssets';
import { VideoCard } from '../components/common/VideoCard';
import { Button } from '../components/common/Button';
import styles from './Album.module.css';

type SortOrder = 'newest' | 'oldest';

export function Album() {
  const { albumId } = useParams<{ albumId: string }>();
  const { album, videos, isLoading, error } = useAssets(albumId);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  const sortedVideos = useMemo(() => {
    const sorted = [...videos];
    sorted.sort((a, b) => {
      const dateA = new Date(a.fileCreatedAt).getTime();
      const dateB = new Date(b.fileCreatedAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    return sorted;
  }, [videos, sortOrder]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading album...</p>
        </div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>Album Not Found</h2>
          <p className={styles.emptyText}>
            {error?.message || 'This album could not be loaded.'}
          </p>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link to="/" className={styles.backLink}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className={styles.title}>{album.albumName}</h1>
            <p className={styles.meta}>{videos.length} videos</p>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.sortToggle}>
            <button
              className={`${styles.sortButton} ${sortOrder === 'newest' ? styles.active : ''}`}
              onClick={() => setSortOrder('newest')}
            >
              Newest
            </button>
            <button
              className={`${styles.sortButton} ${sortOrder === 'oldest' ? styles.active : ''}`}
              onClick={() => setSortOrder('oldest')}
            >
              Oldest
            </button>
          </div>
        </div>
      </header>

      {sortedVideos.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>No Videos</h2>
          <p className={styles.emptyText}>This album doesn't contain any videos yet.</p>
          <Link to="/record">
            <Button>Record a Video</Button>
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {sortedVideos.map((video) => (
            <VideoCard key={video.id} asset={video} albumId={albumId} />
          ))}
        </div>
      )}
    </div>
  );
}
